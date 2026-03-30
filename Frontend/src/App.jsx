import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import router from './router';
import useStore from './store/store';

/**
 * Componente raíz de la aplicación.
 * Provee el router y carga el usuario autenticado al iniciar.
 */
const App = () => {
  const fetchUser = useStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return <RouterProvider router={router} />;
};

export default App;
