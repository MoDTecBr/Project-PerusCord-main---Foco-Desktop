import 'package:flutter/material.dart';

/// Paleta própria do Relay — mesma linguagem visual do documento de
/// arquitetura (Fase 1): neutros ardósia/tinta com leve viés azulado, acento
/// "sinal" laranja-avermelhado e um teal secundário ("wire") para anotações
/// técnicas/estado de conexão. Evita os clichês de UI gerada por IA (roxo
/// vibrante genérico, verde neon sobre preto puro).
class AppPalette {
  const AppPalette({
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.ink,
    required this.inkSoft,
    required this.inkFaint,
    required this.border,
    required this.accent,
    required this.accentInk,
    required this.wire,
    required this.good,
    required this.warn,
    required this.critical,
  });

  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color ink;
  final Color inkSoft;
  final Color inkFaint;
  final Color border;
  final Color accent;
  final Color accentInk;
  final Color wire;
  final Color good;
  final Color warn;
  final Color critical;

  static const light = AppPalette(
    background: Color(0xFFF4F5F2),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFE9EBE6),
    ink: Color(0xFF161A1F),
    inkSoft: Color(0xFF4B5560),
    inkFaint: Color(0xFF7C8790),
    border: Color(0xFFD7DAD4),
    accent: Color(0xFFE05A2B),
    accentInk: Color(0xFFFFFFFF),
    wire: Color(0xFF1F7A76),
    good: Color(0xFF2F8A4B),
    warn: Color(0xFFA8790A),
    critical: Color(0xFFB23A2C),
  );

  static const dark = AppPalette(
    background: Color(0xFF12151A),
    surface: Color(0xFF181C22),
    surfaceAlt: Color(0xFF20252C),
    ink: Color(0xFFEDF0EE),
    inkSoft: Color(0xFFA7B0B8),
    inkFaint: Color(0xFF767F88),
    border: Color(0xFF2A3038),
    accent: Color(0xFFFF7A4D),
    accentInk: Color(0xFF171008),
    wire: Color(0xFF57C9C2),
    good: Color(0xFF57B477),
    warn: Color(0xFFE0AC2B),
    critical: Color(0xFFE2695A),
  );
}
