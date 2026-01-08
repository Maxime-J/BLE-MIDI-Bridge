#include <napi.h>
#include <uv.h>
#include <windows.h>

#include <chrono>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

#include <libremidi/backends/winmm.hpp>
#include <libremidi/libremidi.hpp>

struct Message {
  DWORD packet;
  int64_t send_timestamp;

  Message(const uint8_t* data, uint32_t size, int64_t timestamp)
    : packet(0), send_timestamp(timestamp) {
    memcpy(&packet, data, size);
  }

  bool operator>(const Message& other) const {
    return send_timestamp > other.send_timestamp;
  }
};

class MidiOutput : public Napi::Addon<MidiOutput> {
public:
  MidiOutput(Napi::Env env, Napi::Object exports);
  ~MidiOutput();

private:
  // JS exposed
  void Initialize(const Napi::CallbackInfo& info);
  Napi::Value GetPorts(const Napi::CallbackInfo& info);
  void Open(const Napi::CallbackInfo& info);
  void Send(const Napi::CallbackInfo& info);
  void RefreshPorts(const Napi::CallbackInfo& info);
  void Cleanup(const Napi::CallbackInfo& info);

  // Internals
  void SetPorts(Napi::Env env);
  void ProcessMessages(std::stop_token stoken);
  void DoCleanup();

  bool initialized_ = false;

  std::unique_ptr<libremidi::winmm::observer_manual> observer_;
  Napi::Reference<Napi::Array> ports_;

  std::unique_ptr<libremidi::midi_out_winmm> midi_out_;

  uint8_t* message_buffer_ptr_ = nullptr;
  std::priority_queue<Message, std::vector<Message>, std::greater<Message>> message_queue_;

  std::jthread sender_;
  std::mutex queue_mutex_;
  std::condition_variable queue_cv_;
};

MidiOutput::MidiOutput(Napi::Env env, Napi::Object exports) {
  DefineAddon(exports, {
    InstanceMethod("init", &MidiOutput::Initialize),
    InstanceAccessor("ports", &MidiOutput::GetPorts, nullptr),
    InstanceMethod("open", &MidiOutput::Open),
    InstanceMethod("send", &MidiOutput::Send),
    InstanceMethod("refreshPorts", &MidiOutput::RefreshPorts),
    InstanceMethod("cleanup", &MidiOutput::Cleanup)
  });
}

void MidiOutput::Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  libremidi::observer_configuration obs_config;
  libremidi::winmm_observer_configuration obs_winmm_config;
  observer_ = std::make_unique<libremidi::winmm::observer_manual>(std::move(obs_config), std::move(obs_winmm_config));

  libremidi::output_configuration out_config;
  libremidi::winmm_output_configuration out_winmm_config;
  midi_out_ = std::make_unique<libremidi::midi_out_winmm>(std::move(out_config), std::move(out_winmm_config));

  SetPorts(env);

  Napi::Uint8Array bridge_buffer = info[0].As<Napi::Uint8Array>();
  message_buffer_ptr_ = bridge_buffer.Data();

  // Pre-allocate message queue
  {
    std::vector<Message> container;
    container.reserve(1000);
    message_queue_ = decltype(message_queue_)(
      std::greater<Message>(),
      std::move(container)
    );
  }

  // Ensure a 1ms timer resolution
  // (most likely already requested by softwares used alongside)
  {
    PROCESS_POWER_THROTTLING_STATE PowerThrottling;
    RtlZeroMemory(&PowerThrottling, sizeof(PowerThrottling));
    PowerThrottling.Version = PROCESS_POWER_THROTTLING_CURRENT_VERSION;
    PowerThrottling.ControlMask = PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION;
    PowerThrottling.StateMask = 0;

    SetProcessInformation(GetCurrentProcess(), ProcessPowerThrottling, &PowerThrottling, sizeof(PowerThrottling));

    timeBeginPeriod(1);
  }

  sender_ = std::jthread([this](std::stop_token stoken) {
    ProcessMessages(stoken);
  });

  initialized_ = true;
}

MidiOutput::~MidiOutput() {
  DoCleanup();
}

void MidiOutput::Cleanup(const Napi::CallbackInfo& info) {
  DoCleanup();
}

void MidiOutput::DoCleanup() {
  if (!initialized_) return;

  {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    sender_.request_stop();
    queue_cv_.notify_one();
  }

  sender_.join();
  midi_out_->close_port();
  timeEndPeriod(1);

  initialized_ = false;
}

void MidiOutput::SetPorts(Napi::Env env) {
  auto ports = observer_->get_output_ports();
  Napi::Array js_ports = Napi::Array::New(env, ports.size());

  for (size_t i = 0; i < ports.size(); i++) {
    Napi::Object port_obj = Napi::Object::New(env);

    port_obj.Set("port", Napi::Number::New(env, ports[i].port));
    port_obj.Set("name", Napi::String::New(env, ports[i].port_name));

    js_ports[i] = port_obj;
  }

  ports_.Reset(js_ports, 1);
}

Napi::Value MidiOutput::GetPorts(const Napi::CallbackInfo& info) {
  return ports_.Value();
}

void MidiOutput::RefreshPorts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  observer_->poll();
  SetPorts(env);
}

void MidiOutput::Open(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  midi_out_->close_port();

  uint32_t port_index = info[0].As<Napi::Number>();

  auto err = midi_out_->do_open(port_index);

  if (err != stdx::error{}) {
    auto err_message = err.message();
    auto reason = std::string(err_message.data(), err_message.size());
    Napi::Error::New(env, "MIDI - Failed to open MIDI port:" + reason).ThrowAsJavaScriptException();
  }
}

void MidiOutput::Send(const Napi::CallbackInfo& info) {
  uint32_t size = info[0].As<Napi::Number>();
  int64_t timestamp = info[1].As<Napi::Number>();

  Message queued_message(message_buffer_ptr_, size, timestamp);

  {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    message_queue_.push(std::move(queued_message));
  }

  queue_cv_.notify_one();
}

void MidiOutput::ProcessMessages(std::stop_token stoken) {
  constexpr int64_t YIELD_THRESHOLD_NS = 2'000'000;

  while (true) {
    std::unique_lock<std::mutex> lock(queue_mutex_);
    if (stoken.stop_requested()) return;

    queue_cv_.wait(lock);

    while (!message_queue_.empty()) {
      auto message = message_queue_.top();
      auto target = message.send_timestamp;
      int64_t wait_ns = target - uv_hrtime();

      if (wait_ns > YIELD_THRESHOLD_NS) {
        queue_cv_.wait_for(lock, std::chrono::nanoseconds(wait_ns - YIELD_THRESHOLD_NS));
        if (stoken.stop_requested()) return;
        continue;
      }

      if (wait_ns > 0) {
        lock.unlock();
        while (uv_hrtime() < target) {
          Sleep(0);
        }
        lock.lock();
        message = message_queue_.top();
      }

      auto message_packet = message.packet;
      message_queue_.pop();
      lock.unlock();

      midi_out_->send_packet(message_packet);

      lock.lock();
    }
  }
}

NODE_API_ADDON(MidiOutput)
