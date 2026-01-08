cmake_minimum_required(VERSION 3.31)
project(midi-out)

execute_process(
  COMMAND node -p "const path = require('node:path'); path.resolve(require('node-addon-api').include_dir);"
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  OUTPUT_VARIABLE CMAKE_JS_NAPI_INC
  OUTPUT_STRIP_TRAILING_WHITESPACE
)

add_compile_definitions(
  NAPI_VERSION=10
  _WIN32_WINNT=0x0A00
  WIN32_LEAN_AND_MEAN
  NOMINMAX
)

add_library(${PROJECT_NAME} SHARED addon.cc ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_compile_definitions(${PROJECT_NAME} PRIVATE LIBREMIDI_HEADER_ONLY=1 LIBREMIDI_WINMM=1)
target_include_directories(${PROJECT_NAME} PRIVATE
  libremidi/include
  ${CMAKE_JS_NAPI_INC}
  ${CMAKE_JS_INC}
)
target_link_libraries(${PROJECT_NAME} PRIVATE kernel32 winmm ${CMAKE_JS_LIB})
target_compile_features(${PROJECT_NAME} PRIVATE cxx_std_20)
