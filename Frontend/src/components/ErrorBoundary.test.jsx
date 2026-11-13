import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function Bomba() {
  throw new Error('fallo de prueba');
}

describe('ErrorBoundary', () => {
  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido sano</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('contenido sano')).toBeTruthy();
  });

  it('muestra la vista de recuperación cuando un hijo explota', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Algo salió mal')).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
    console.error.mockRestore();
  });
});
