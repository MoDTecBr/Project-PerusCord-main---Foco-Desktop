import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import '../config/env.dart';

enum RealtimeConnectionState { disconnected, connecting, connected }

/// Wrapper fino sobre o socket Socket.IO — conecta autenticado com o access
/// token no handshake (`auth: { token }`), como o `RealtimeGateway` do
/// backend espera. Reconexão automática já vem de graça do socket.io_client.
/// `state` é observável (`ValueNotifier`) para a UI mostrar o status da
/// conexão em tempo real (ex: badge "conectado"/"reconectando").
class RealtimeClient {
  socket_io.Socket? _socket;
  final ValueNotifier<RealtimeConnectionState> state =
      ValueNotifier(RealtimeConnectionState.disconnected);

  void connect(String accessToken) {
    _socket?.dispose();
    state.value = RealtimeConnectionState.connecting;

    _socket = socket_io.io(
      Env.wsBaseUrl,
      socket_io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken})
          .disableAutoConnect()
          .build(),
    );

    _socket!
      ..onConnect((_) => state.value = RealtimeConnectionState.connected)
      ..onDisconnect((_) => state.value = RealtimeConnectionState.disconnected)
      ..onConnectError((_) => state.value = RealtimeConnectionState.disconnected)
      ..connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    state.value = RealtimeConnectionState.disconnected;
  }

  void on(String event, void Function(dynamic data) handler) {
    _socket?.on(event, handler);
  }

  /// Remove só ESTE handler — nunca omita [handler] quando vários lugares do
  /// app (ex: um controller por canal aberto) escutam o mesmo nome de
  /// evento; sem o handler específico, `socket.off(event)` derrubaria os
  /// listeners de todos os outros também.
  void off(String event, void Function(dynamic data) handler) {
    _socket?.off(event, handler);
  }

  void emit(String event, [dynamic data]) {
    _socket?.emit(event, data);
  }
}
