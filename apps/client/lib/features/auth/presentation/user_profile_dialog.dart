import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../messages/data/uploads_repository.dart';
import '../application/auth_controller.dart';

const Map<String, String> _extensionToMimeType = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
};

String _guessMimeType(String filename) {
  final ext = filename.contains('.') ? filename.split('.').last.toLowerCase() : '';
  return _extensionToMimeType[ext] ?? 'image/jpeg';
}

class UserProfileDialog extends ConsumerStatefulWidget {
  const UserProfileDialog({
    super.key,
    required this.currentDisplayName,
    this.currentAvatarUrl,
  });

  final String currentDisplayName;
  final String? currentAvatarUrl;

  @override
  ConsumerState<UserProfileDialog> createState() => _UserProfileDialogState();
}

class _UserProfileDialogState extends ConsumerState<UserProfileDialog> {
  late final TextEditingController _nameController;
  bool _isLoading = false;
  XFile? _pickedAvatar;
  Uint8List? _newAvatarBytes;
  String? _error;
  String? _cacheClearedMessage;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.currentDisplayName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);

    if (pickedFile != null) {
      final bytes = await pickedFile.readAsBytes();
      setState(() {
        _pickedAvatar = pickedFile;
        _newAvatarBytes = bytes;
      });
    }
  }

  /// Esvazia na hora o cache de imagens decodificadas (avatares, anexos do
  /// chat) que o Flutter mantém em memória — o único "despejo de lixo" que a
  /// própria VM Dart deixa o app disparar; forçar o coletor de lixo em si
  /// não é uma API exposta a apps em produção.
  void _clearImageCache() {
    final cache = PaintingBinding.instance.imageCache;
    final freedMb = cache.currentSizeBytes / (1024 * 1024);
    final freedCount = cache.currentSize;
    cache.clear();
    cache.clearLiveImages();
    setState(() {
      _cacheClearedMessage = freedCount == 0
          ? 'Cache já estava vazio.'
          : 'Cache limpo: $freedCount imagens, ${freedMb.toStringAsFixed(1)} MB liberados.';
    });
  }

  Future<void> _saveProfile() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      String? avatarUrl;
      final picked = _pickedAvatar;
      final bytes = _newAvatarBytes;
      if (picked != null && bytes != null) {
        final attachment = await ref.read(uploadsRepositoryProvider).uploadImage(
              bytes: bytes,
              filename: picked.name,
              mimeType: picked.mimeType ?? _guessMimeType(picked.name),
            );
        avatarUrl = attachment.url;
      }

      await ref.read(authControllerProvider.notifier).updateProfile(
            displayName: newName == widget.currentDisplayName ? null : newName,
            avatarUrl: avatarUrl,
          );

      if (mounted) {
        Navigator.pop(context, true);
      }
    } on ApiException catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.message;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Não foi possível salvar seu perfil.';
      });
    }
  }


  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;

    return AlertDialog(
      backgroundColor: relay.surfaceAlt,
      surfaceTintColor: Colors.transparent,
      title: const Text('Meu Perfil', style: TextStyle(fontWeight: FontWeight.bold)),
      content: SizedBox(
        width: 360,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              onTap: _isLoading ? null : _pickAvatar,
              child: Stack(
                alignment: Alignment.bottomRight,
                children: [
                  CircleAvatar(
                    radius: 46,
                    backgroundColor: relay.wire,
                    backgroundImage: _newAvatarBytes != null
                        ? MemoryImage(_newAvatarBytes!)
                        : (widget.currentAvatarUrl != null ? NetworkImage(widget.currentAvatarUrl!) : null) as ImageProvider?,
                    child: (_newAvatarBytes == null && widget.currentAvatarUrl == null)
                        ? Text(
                            widget.currentDisplayName.substring(0, 1).toUpperCase(),
                            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: relay.background),
                          )
                        : null,
                  ),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: relay.accent,
                      shape: BoxShape.circle,
                      border: Border.all(color: relay.surfaceAlt, width: 3),
                    ),
                    child: Icon(Icons.edit, size: 14, color: relay.accentInk),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'NOME DE EXIBIÇÃO',
                  style: TextStyle(color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _nameController,
                  enabled: !_isLoading,
                  maxLength: 32,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: relay.background,
                    counterText: '', 
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: relay.critical, fontSize: 12)),
                ],
                const SizedBox(height: 24),
                Text(
                  'ARMAZENAMENTO',
                  style: TextStyle(color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Libera na hora as imagens (avatares, anexos do chat) que o app '
                        'mantém guardadas em memória.',
                        style: TextStyle(color: relay.inkFaint, fontSize: 11.5),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _clearImageCache,
                      child: const Text('Limpar cache'),
                    ),
                  ],
                ),
                if (_cacheClearedMessage != null) ...[
                  const SizedBox(height: 6),
                  Text(_cacheClearedMessage!, style: TextStyle(color: relay.accent, fontSize: 11)),
                ],
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _isLoading ? null : _saveProfile,
          child: _isLoading
              ? SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: relay.background),
                )
              : const Text('Salvar Alterações'),
        ),
      ],
    );
  }
}