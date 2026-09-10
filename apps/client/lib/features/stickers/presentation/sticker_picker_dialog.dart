import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../messages/data/uploads_repository.dart';
import '../application/stickers_controller.dart';
import '../data/stickers_repository.dart';
import '../domain/sticker_models.dart';

const _extensionToMimeType = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
};

String _guessMimeType(String filename) {
  final ext = filename.contains('.') ? filename.split('.').last.toLowerCase() : '';
  return _extensionToMimeType[ext] ?? 'image/png';
}

/// Figurinhas são por usuário (não por servidor) — a pessoa sobe as próprias
/// e usa em qualquer servidor/DM. Enviar reaproveita o mecanismo de anexo de
/// imagem já existente no chat (ver `Sticker.toAttachment`).
class StickerPickerDialog extends ConsumerStatefulWidget {
  const StickerPickerDialog({super.key, required this.onSelect});

  final ValueChanged<Sticker> onSelect;

  @override
  ConsumerState<StickerPickerDialog> createState() => _StickerPickerDialogState();
}

class _StickerPickerDialogState extends ConsumerState<StickerPickerDialog> {
  bool _uploading = false;
  String? _error;

  Future<void> _addSticker() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (picked == null) return;

    setState(() {
      _uploading = true;
      _error = null;
    });

    try {
      final bytes = await picked.readAsBytes();
      final mimeType = picked.mimeType ?? _guessMimeType(picked.name);
      final uploaded = await ref.read(uploadsRepositoryProvider).uploadImage(
            bytes: bytes,
            filename: picked.name,
            mimeType: mimeType,
          );
      await ref.read(stickersRepositoryProvider).create(
            url: uploaded.url,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            name: picked.name,
          );
      ref.invalidate(stickersListProvider);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _confirmRemove(Sticker sticker) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remover figurinha?'),
        content: const Text('Essa ação não pode ser desfeita.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Remover')),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(stickersRepositoryProvider).remove(sticker.id);
    ref.invalidate(stickersListProvider);
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final stickersAsync = ref.watch(stickersListProvider);

    return AlertDialog(
      title: const Text('Figurinhas'),
      content: SizedBox(
        width: 360,
        height: 400,
        child: Column(
          children: [
            Expanded(
              child: stickersAsync.when(
                data: (stickers) => stickers.isEmpty
                    ? Center(
                        child: Text(
                          'Você ainda não tem figurinhas.\nToque em "Adicionar" pra subir a primeira.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: relay.inkFaint, fontSize: 13),
                        ),
                      )
                    : GridView.builder(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        itemCount: stickers.length,
                        itemBuilder: (context, index) {
                          final sticker = stickers[index];
                          return InkWell(
                            borderRadius: BorderRadius.circular(8),
                            onTap: () {
                              widget.onSelect(sticker);
                              Navigator.pop(context);
                            },
                            onLongPress: () => _confirmRemove(sticker),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                sticker.url,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stack) => Container(
                                  color: relay.surfaceAlt,
                                  alignment: Alignment.center,
                                  child: Icon(Icons.broken_image_outlined,
                                      color: relay.inkFaint, size: 18),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(
                  child: Text('Não foi possível carregar suas figurinhas.',
                      style: TextStyle(color: relay.critical, fontSize: 13)),
                ),
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: TextStyle(color: relay.critical, fontSize: 12)),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _uploading ? null : _addSticker,
          child: _uploading
              ? const SizedBox(
                  width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Adicionar'),
        ),
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Fechar')),
      ],
    );
  }
}
