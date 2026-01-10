# BLE-MIDI Bridge

A simple portable app which permits to connect one or multiple Bluetooth devices and send their MIDI messages to a MIDI port.\
In other terms, it's a way to use Bluetooth MIDI devices with any DAW or virtual instrument software.

It's a one way communication, SysEx excluded.

Download: [Windows only](https://github.com/Maxime-J/BLE-MIDI-Bridge/releases/latest/download/ble-midi-bridge-windows-x64.zip)\
(Other OSs shouldn't be needed, see Context below)

[![Downloads count](https://img.shields.io/github/downloads/Maxime-J/BLE-MIDI-Bridge/total?color=%23006398)](https://github.com/Maxime-J/BLE-MIDI-Bridge/releases)

## Usage
Pretty self-explanatory:

| MIDI port selection | Device selection | Working state |
| :---: | :---: | :---: |
| ![1](screenshots/1.png) | ![2](screenshots/2.png) | ![3](screenshots/3.png) |

No system coupling needed.\
No specific order to follow.

MIDI port can be freely changed.\
Devices can be disconnected at any time, either from the app or from device.\
Closing the app properly disconnects all devices and saves the current setup for later use.

## Prerequisite
loopMIDI (or any other virtual loopback MIDI system) is most likely needed:\
https://www.tobias-erichsen.de/software/loopmidi.html

## Context
macOS has a top notch MIDI support, and BLE-MIDI is natively supported.\
Most Linux distributions don't support BLE-MIDI by default, but BlueZ can be recompiled to enable it.

Windows is another thing, BLE-MIDI is supported only through UWP, which leaves out the majority of music softwares.

Some solutions exist though:\
-Sonar, a DAW which can use MIDI through UWP.\
-MIDIberry, a bridge app available in Microsoft store.\
-KORG BLE-MIDI driver, a proprietary driver often mentionned as working with non KORG products.\
-MidiListUWP.

But in my experience, either it was:\
not fully working or not working at all, not efficient in terms of latency, limited to one device in free version, not straightforward to use.\
I'd like to mention FlexiBLE MIDI too, a tool which gave me the concept idea, but very limited in terms of BLE-MIDI/MIDI implementation.

BLE-MIDI Bridge is a working simple and performant alternative, with different limitations and advantages.

## About timing
The first MIDI message of a received packet is sent as soon as possible\
and the eventual following ones are sent respecting the timestamps.

## MIDI references
[BLE-MIDI specification](https://drive.google.com/file/d/15jF6H78kMS0jEBQ7JpH0W6MHf_yxoE5r/view?usp=drive_link)\
[MIDI Status bytes list](https://midi.org/expanded-midi-1-0-messages-list)