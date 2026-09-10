import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../messages/data/uploads_repository.dart';
import '../application/auth_controller.dart';
import '../domain/auth_models.dart';

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
  const UserProfileDialog({super.key, required this.currentUser});

  final CurrentUser currentUser;

  @override
  ConsumerState<UserProfileDialog> createState() => _UserProfileDialogState();
}

class _UserProfileDialogState extends ConsumerState<UserProfileDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _statusController;
  late final TextEditingController _bioController;
  bool _isLoading = false;
  XFile? _pickedAvatar;
  Uint8List? _newAvatarBytes;
  XFile? _pickedBanner;
  Uint8List? _newBannerBytes;
  String? _error;
  String? _cacheClearedMessage;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.currentUser.displayName);
    _statusController = TextEditingController(text: widget.currentUser.customStatus ?? '');
    _bioController = TextEditingController(text: widget.currentUser.bio ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _statusController.dispose();
    _bioController.dispose();
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

  Future<void> _pickBanner() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);

    if (pickedFile != null) {
      final bytes = await pickedFile.readAsBytes();
      setState(() {
        _pickedBanner = pickedFile;
        _newBannerBytes = bytes;
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

  Future<String?> _uploadIfPicked(XFile? picked, Uint8List? bytes) async {
    if (picked == null || bytes == null) return null;
    final attachment = await ref.read(uploadsRepositoryProvider).uploadImage(
          bytes: bytes,
          filename: picked.name,
          mimeType: picked.mimeType ?? _guessMimeType(picked.name),
        );
    return attachment.url;
  }

  Future<void> _saveProfile() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) return;
    final newStatus = _statusController.text.trim();
    final newBio = _bioController.text.trim();

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final avatarUrl = await _uploadIfPicked(_pickedAvatar, _newAvatarBytes);
      final bannerUrl = await _uploadIfPicked(_pickedBanner, _newBannerBytes);

      await ref.read(authControllerProvider.notifier).updateProfile(
            displayName: newName == widget.currentUser.displayName ? null : newName,
            avatarUrl: avatarUrl,
            bannerUrl: bannerUrl,
            customStatus: newStatus == (widget.currentUser.customStatus ?? '') ? null : newStatus,
            bio: newBio == (widget.currentUser.bio ?? '') ? null : newBio,
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
    final bannerUrl = widget.currentUser.bannerUrl;

    return AlertDialog(
      backgroundColor: relay.surfaceAlt,
      surfaceTintColor: Colors.transparent,
      title: const Text('Meu Perfil', style: TextStyle(fontWeight: FontWeight.bold)),
      content: SizedBox(
        width: 380,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              GestureDetector(
                onTap: _isLoading ? null : _pickBanner,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: _newBannerBytes != null
                          ? Image.memory(_newBannerBytes!,
                              height: 90, width: double.infinity, fit: BoxFit.cover)
                          : bannerUrl != null
                              ? Image.network(bannerUrl,
                                  height: 90, width: double.infinity, fit: BoxFit.cover)
                              : Container(height: 90, width: double.infinity, color: relay.accent),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('Trocar banner',
                          style: TextStyle(color: Colors.white, fontSize: 11)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
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
                          : (widget.currentUser.avatarUrl != null
                              ? NetworkImage(widget.currentUser.avatarUrl!)
                              : null) as ImageProvider?,
                      child: (_newAvatarBytes == null && widget.currentUser.avatarUrl == null)
                          ? Text(
                              widget.currentUser.displayName.substring(0, 1).toUpperCase(),
                              style: TextStyle(
                                  fontSize: 32, fontWeight: FontWeight.bold, color: relay.background),
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
                  _ProfileTextField(controller: _nameController, enabled: !_isLoading, maxLength: 32),
                  const SizedBox(height: 16),
                  Text(
                    'STATUS PERSONALIZADO',
                    style: TextStyle(color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _ProfileTextField(
                    controller: _statusController,
                    enabled: !_isLoading,
                    maxLength: 128,
                    hintText: 'Ex: focado no trampo, disponível pra jogar…',
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'SOBRE MIM',
                    style: TextStyle(color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _ProfileTextField(
                    controller: _bioController,
                    enabled: !_isLoading,
                    maxLength: 190,
                    maxLines: 3,
                    hintText: 'Conte um pouco sobre você…',
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

class _ProfileTextField extends StatelessWidget {
  const _ProfileTextField({
    required this.controller,
    required this.enabled,
    required this.maxLength,
    this.maxLines = 1,
    this.hintText,
  });

  final TextEditingController controller;
  final bool enabled;
  final int maxLength;
  final int maxLines;
  final String? hintText;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return TextField(
      controller: controller,
      enabled: enabled,
      maxLength: maxLength,
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hintText,
        filled: true,
        fillColor: relay.background,
        counterText: '',
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
