import 'package:flutter/material.dart';
import '../config/app_config.dart';
import 'catalogo_screen.dart';
import 'mis_inmuebles_screen.dart';
import 'mis_mensajes_screen.dart';
import 'mi_perfil_screen.dart';
import 'mi_agenda_screen.dart';
import 'mis_favoritos_screen.dart';
import 'mis_contratos_screen.dart';
import 'mis_pagos_screen.dart';
import 'mis_notificaciones_screen.dart';
import 'finanzas_propietario_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    CatalogoScreen(),
    MisMensajesScreen(),
    MiPerfilScreen(),
    MisInmueblesScreen(),
    MisContratosScreen(),
  ];

  void _abrirMenuPropiedades() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Propiedades',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(
                Icons.home_work_outlined,
                color: AppColors.primary,
              ),
              title: const Text(
                'Mis propiedades',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                setState(() => _currentIndex = 3);
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.account_balance_wallet_outlined,
                color: AppColors.success,
              ),
              title: const Text(
                'Mis finanzas',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const FinanzasPropietarioScreen(),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.calendar_today_outlined,
                color: AppColors.primary,
              ),
              title: const Text(
                'Mis visitas',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MiAgendaScreen()),
                );
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.favorite_border,
                color: AppColors.error,
              ),
              title: const Text(
                'Mis favoritos',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MisFavoritosScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _abrirMenuTramites() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Mi actividad',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(
                Icons.description_outlined,
                color: AppColors.success,
              ),
              title: const Text(
                'Mis contratos',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                setState(() => _currentIndex = 4);
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.payments_outlined,
                color: AppColors.primary,
              ),
              title: const Text(
                'Mis pagos',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MisPagosScreen()),
                );
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.notifications_none,
                color: Color(0xFFFBBF24),
              ),
              title: const Text(
                'Mis avisos',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const MisNotificacionesScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      // ─── Barra Superior con Degradado Oscuro y Logo ───
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(96),
        child: Container(
          decoration: const BoxDecoration(
            gradient: AppColors.darkHeaderGradient,
            border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
          ),
          child: SafeArea(
            child: Column(
              children: [
                // Cabecera Principal de Marca
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                  alignment: Alignment.centerLeft,
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.asset(
                          'assets/images/logo_icon_dark.png',
                          width: 28,
                          height: 28,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) =>
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Icon(
                                  Icons.domain,
                                  color: Colors.white,
                                  size: 18,
                                ),
                              ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Inmobiliaria Nobleve',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderSubtle),

                // Pestañas Superiores (Catálogo, Mensajes, Mi Perfil)
                Expanded(
                  child: Row(
                    children: [
                      _buildTopTabItem(
                        0,
                        Icons.storefront_outlined,
                        Icons.storefront,
                        'Catálogo',
                      ),
                      _buildTopTabItem(
                        1,
                        Icons.chat_bubble_outline,
                        Icons.chat_bubble,
                        'Mensajes',
                      ),
                      _buildTopTabItem(
                        2,
                        Icons.person_outline,
                        Icons.person,
                        'Mi Perfil',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),

      // ─── Pantalla Activa ───
      body: IndexedStack(index: _currentIndex, children: _screens),

      // ─── Barra Inferior con Fondo Oscuro (Propiedades, Trámites) ───
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundSecondary,
          border: Border(top: BorderSide(color: AppColors.borderSubtle)),
        ),
        child: BottomNavigationBar(
          backgroundColor: AppColors.backgroundSecondary,
          elevation: 0,
          currentIndex: _currentIndex == 3 ? 0 : (_currentIndex == 4 ? 1 : 0),
          onTap: (index) {
            final targetIndex = index == 0 ? 3 : 4;
            if (_currentIndex == targetIndex) {
              if (targetIndex == 3) {
                _abrirMenuPropiedades();
              } else {
                _abrirMenuTramites();
              }
            } else {
              setState(() => _currentIndex = targetIndex);
            }
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.domain_outlined),
              activeIcon: Icon(Icons.domain),
              label: 'Propiedades',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              activeIcon: Icon(Icons.receipt_long),
              label: 'Mi actividad',
            ),
          ],
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textMuted,
          selectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildTopTabItem(
    int index,
    IconData unselectedIcon,
    IconData selectedIcon,
    String label,
  ) {
    final isSelected = _currentIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isSelected ? AppColors.primary : Colors.transparent,
                width: 2.5,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isSelected ? selectedIcon : unselectedIcon,
                size: 18,
                color: isSelected ? AppColors.primary : AppColors.textMuted,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected
                      ? AppColors.textPrimary
                      : AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
