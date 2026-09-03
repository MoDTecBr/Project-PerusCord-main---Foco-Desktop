import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../application/voice_call_controller.dart';

/// Modal que lista microfones e saídas de áudio (fone/alto-falante)
/// disponíveis no Windows e troca o dispositivo da chamada em andamento,
/// sem precisar sair e entrar de novo no canal.
class AudioDevicePicker extends ConsumerStatefulWidget {
  const AudioDevicePicker({
    super.key,
    required this.selectedMicId,
    required this.selectedOutputId,
  });

  final String? selectedMicId;
  final String? selectedOutputId;

  @override
  ConsumerState<AudioDevicePicker> createState() => _AudioDevicePickerState();
}

class _AudioDevicePickerState extends ConsumerState<AudioDevicePicker> {
  List<lk.MediaDevice> _mics = [];
  List<lk.MediaDevice> _outputs = [];
  bool _isLoading = true;
  String? _selectedMicId;
  String? _selectedOutputId;
  StreamSubscription<List<lk.MediaDevice>>? _deviceChangeSubscription;

  @override
  void initState() {
    super.initState();
    _selectedMicId = widget.selectedMicId;
    _selectedOutputId = widget.selectedOutputId;
    _load();
    // Reage a fone/mic sendo plugado ou desplugado enquanto o dialog está
    // aberto — sem isso a lista fica congelada na foto do momento em que
    // foi aberto, e um fone recém-conectado nem aparece pra escolher.
    _deviceChangeSubscription =
        lk.Hardware.instance.onDeviceChange.stream.listen((devices) {
      if (!mounted) return;
      setState(() {
        _mics = devices.where((d) => d.kind == 'audioinput').toList();
        _outputs = devices.where((d) => d.kind == 'audiooutput').toList();
      });
    });
  }

  @override
  void dispose() {
    _deviceChangeSubscription?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final mics = await lk.Hardware.instance.audioInputs();
    final outputs = await lk.Hardware.instance.audioOutputs();
    if (!mounted) return;
    setState(() {
      _mics = mics;
      _outputs = outputs;
      _isLoading = false;
    });
  }

  Future<void> _selectMic(lk.MediaDevice device) async {
    setState(() => _selectedMicId = device.deviceId);
    await ref.read(voiceCallControllerProvider.notifier).setMicrophoneDevice(device);
  }

  Future<void> _selectOutput(lk.MediaDevice device) async {
    setState(() => _selectedOutputId = device.deviceId);
    await ref.read(voiceCallControllerProvider.notifier).setOutputDevice(device);
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;

    return AlertDialog(
      backgroundColor: Theme.of(context).colorScheme.surface,
      title: const Text('Dispositivos de áudio'),
      content: SizedBox(
        width: 420,
        child: _isLoading
            ? const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()))
            : SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionLabel('Microfone', relay),
                    if (_mics.isEmpty) _EmptyHint('Nenhum microfone encontrado', relay),
                    for (final device in _mics)
                      _DeviceTile(
                        device: device,
                        selected: device.deviceId == _selectedMicId,
                        relay: relay,
                        onTap: () => _selectMic(device),
                      ),
                    const SizedBox(height: 16),
                    _SectionLabel('Saída (fone / alto-falante)', relay),
                    if (_outputs.isEmpty) _EmptyHint('Nenhuma saída encontrada', relay),
                    for (final device in _outputs)
                      _DeviceTile(
                        device: device,
                        selected: device.deviceId == _selectedOutputId,
                        relay: relay,
                        onTap: () => _selectOutput(device),
                      ),
                  ],
                ),
              ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Fechar'),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text, this.relay);
  final String text;
  final AppPalette relay;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        text,
        style: TextStyle(color: relay.inkSoft, fontWeight: FontWeight.w700, fontSize: 12),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint(this.text, this.relay);
  final String text;
  final AppPalette relay;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(text, style: TextStyle(color: relay.inkSoft, fontSize: 13)),
    );
  }
}

class _DeviceTile extends StatelessWidget {
  const _DeviceTile({
    required this.device,
    required this.selected,
    required this.relay,
    required this.onTap,
  });

  final lk.MediaDevice device;
  final bool selected;
  final AppPalette relay;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = device.label.isNotEmpty ? device.label : device.deviceId;
    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              size: 18,
              color: selected ? relay.good : relay.inkSoft,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: relay.ink,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
