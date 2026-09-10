import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Lembra qual microfone e qual saída de áudio (fone/alto-falante) o usuário
/// escolheu manualmente, para não depender de heurísticas de auto-detecção
/// (que erram sempre que o Windows reordena os dispositivos entre execuções).
class AudioDevicePrefs {
  AudioDevicePrefs({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _micKey = 'relay.audio.micDeviceId';
  static const _outputKey = 'relay.audio.outputDeviceId';
  static const _videoCodecKey = 'relay.video.codec';
  static const _screenShareQualityKey = 'relay.screenshare.quality';
  static const _echoCancellationKey = 'relay.audio.echoCancellation';
  static const _noiseSuppressionKey = 'relay.audio.noiseSuppression';
  static const _micGainKey = 'relay.audio.micGain';

  Future<void> saveMic(String deviceId) => _safeWrite(_micKey, deviceId);
  Future<void> saveOutput(String deviceId) => _safeWrite(_outputKey, deviceId);
  Future<void> saveVideoCodec(String codec) => _safeWrite(_videoCodecKey, codec);
  Future<void> saveScreenShareQuality(String quality) =>
      _safeWrite(_screenShareQualityKey, quality);
  Future<void> saveEchoCancellation(bool value) => _safeWriteBool(_echoCancellationKey, value);
  Future<void> saveNoiseSuppression(bool value) => _safeWriteBool(_noiseSuppressionKey, value);
  Future<void> saveMicGain(double value) => _safeWrite(_micGainKey, value.toString());

  Future<String?> readMic() => _safeRead(_micKey);
  Future<String?> readOutput() => _safeRead(_outputKey);
  Future<String?> readVideoCodec() => _safeRead(_videoCodecKey);
  Future<String?> readScreenShareQuality() => _safeRead(_screenShareQualityKey);
  Future<bool> readEchoCancellation() => _safeReadBool(_echoCancellationKey);
  Future<bool> readNoiseSuppression() => _safeReadBool(_noiseSuppressionKey);

  Future<double> readMicGain() async {
    final raw = await _safeRead(_micGainKey);
    return raw == null ? 1.0 : double.tryParse(raw) ?? 1.0;
  }

  Future<void> _safeWrite(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (error) {
      debugPrint('AudioDevicePrefs.write falhou: $error');
    }
  }

  Future<String?> _safeRead(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (error) {
      debugPrint('AudioDevicePrefs.read falhou: $error');
      return null;
    }
  }

  Future<void> _safeWriteBool(String key, bool value) => _safeWrite(key, value ? '1' : '0');

  Future<bool> _safeReadBool(String key) async => (await _safeRead(key)) == '1';
}
