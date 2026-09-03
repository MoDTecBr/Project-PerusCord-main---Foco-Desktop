import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class DesktopScreenPicker extends StatefulWidget {
  const DesktopScreenPicker({super.key});

  @override
  State<DesktopScreenPicker> createState() => _DesktopScreenPickerState();
}

class _DesktopScreenPickerState extends State<DesktopScreenPicker> {
  final Map<String, DesktopCapturerSource> _sources = {};
  final List<StreamSubscription> _subscriptions = [];
  Timer? _refreshTimer;

  SourceType _activeTab = SourceType.Screen;
  DesktopCapturerSource? _selected;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _subscriptions.add(desktopCapturer.onAdded.stream.listen((source) {
        setState(() => _sources[source.id] = source);
      }));
      _subscriptions.add(desktopCapturer.onRemoved.stream.listen((source) {
        setState(() {
          _sources.remove(source.id);
          if (_selected?.id == source.id) _selected = null;
        });
      }));
      _loadSources();
      // A lista inicial vem sem miniatura (o plugin nativo não busca a
      // prévia na primeira chamada); esse timer força o SO a gerar e
      // empurrar as miniaturas via evento (desktopSourceThumbnailChanged),
      // que cada _ThumbnailTile escuta individualmente.
      _refreshTimer = Timer.periodic(const Duration(seconds: 2), (_) {
        desktopCapturer.updateSources(types: const [SourceType.Screen, SourceType.Window]);
      });
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    super.dispose();
  }

  Future<void> _loadSources() async {
    try {
      final sources = await desktopCapturer.getSources(
        types: const [SourceType.Screen, SourceType.Window],
      );
      if (!mounted) return;
      setState(() {
        for (final source in sources) {
          _sources[source.id] = source;
        }
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return AlertDialog(
        backgroundColor: Theme.of(context).colorScheme.surface,
        title: const Text('Compartilhar Tela'),
        content: const Text('No navegador, o próprio Chrome abrirá o seletor. Deseja continuar?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, null),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continuar'),
          ),
        ],
      );
    }

    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final items = _sources.values.where((s) => s.type == _activeTab).toList();

    return AlertDialog(
      backgroundColor: relay.surface,
      insetPadding: const EdgeInsets.all(24),
      title: Text('Escolha o que compartilhar', style: TextStyle(color: relay.ink)),
      content: SizedBox(
        width: 640,
        height: 480,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _TabButton(
                  label: 'Tela inteira',
                  selected: _activeTab == SourceType.Screen,
                  relay: relay,
                  onTap: () => setState(() => _activeTab = SourceType.Screen),
                ),
                const SizedBox(width: 8),
                _TabButton(
                  label: 'Janela',
                  selected: _activeTab == SourceType.Window,
                  relay: relay,
                  onTap: () => setState(() => _activeTab = SourceType.Window),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Divider(color: relay.border, height: 1),
            const SizedBox(height: 12),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : items.isEmpty
                      ? Center(
                          child: Text(
                            _activeTab == SourceType.Screen
                                ? 'Nenhuma tela encontrada'
                                : 'Nenhuma janela encontrada',
                            style: TextStyle(color: relay.inkFaint),
                          ),
                        )
                      : GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 1.4,
                          ),
                          itemCount: items.length,
                          itemBuilder: (context, index) {
                            final source = items[index];
                            return _ThumbnailTile(
                              source: source,
                              selected: _selected?.id == source.id,
                              relay: relay,
                              onTap: () => setState(() => _selected = source),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, null),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _selected == null ? null : () => Navigator.pop(context, _selected),
          child: const Text('Compartilhar'),
        ),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.relay,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final AppPalette relay;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? relay.surfaceAlt : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? relay.accent : relay.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? relay.ink : relay.inkFaint,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

/// Renderiza a miniatura de uma fonte e se atualiza sozinha quando o
/// plugin nativo empurra uma prévia nova para ela (a busca inicial de
/// fontes não vem com miniatura — só chega depois, via stream).
class _ThumbnailTile extends StatefulWidget {
  const _ThumbnailTile({
    required this.source,
    required this.selected,
    required this.relay,
    required this.onTap,
  });

  final DesktopCapturerSource source;
  final bool selected;
  final AppPalette relay;
  final VoidCallback onTap;

  @override
  State<_ThumbnailTile> createState() => _ThumbnailTileState();
}

class _ThumbnailTileState extends State<_ThumbnailTile> {
  StreamSubscription? _subscription;
  Uint8List? _thumbnail;

  @override
  void initState() {
    super.initState();
    _thumbnail = widget.source.thumbnail;
    _subscription = widget.source.onThumbnailChanged.stream.listen((bytes) {
      if (mounted) setState(() => _thumbnail = bytes);
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final relay = widget.relay;
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: relay.surfaceAlt,
          border: Border.all(color: widget.selected ? relay.accent : relay.border, width: widget.selected ? 2 : 1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Expanded(
              child: _thumbnail != null
                  ? Image.memory(_thumbnail!, fit: BoxFit.contain, gaplessPlayback: true)
                  : Icon(
                      widget.source.type == SourceType.Screen ? Icons.desktop_windows_outlined : Icons.window_outlined,
                      size: 40,
                      color: relay.inkFaint,
                    ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.source.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: relay.inkSoft, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
