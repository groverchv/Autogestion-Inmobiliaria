import 'package:flutter/material.dart';
import '../utils/mensajes_error.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  Usuario? _user;
  bool _isLoading = false;
  String? _errorMessage;

  Usuario? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  ApiService get apiService => _apiService;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.login(email, password);
      _user = await _apiService.getProfile();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = mensajeError(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> userData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.register(userData);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = mensajeError(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> checkExistingAuth() async {
    final token = await _apiService.getToken();
    if (token != null) {
      try {
        _user = await _apiService.getProfile();
        notifyListeners();
      } catch (e) {
        await _apiService.clearAuth();
        _user = null;
        notifyListeners();
      }
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    try {
      _user = await _apiService.updateProfile(data);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> refreshProfile() async {
    try {
      _user = await _apiService.getProfile();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> logout() async {
    await _apiService.clearAuth();
    _user = null;
    notifyListeners();
  }
}
