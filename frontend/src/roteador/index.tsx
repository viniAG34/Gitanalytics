import { Route, Routes } from 'react-router-dom';
import { RotaPrivada } from '../componentes/layout/RotaPrivada';
import { LoginPage } from '../paginas/LoginPage';
import { RegisterPage } from '../paginas/RegisterPage';
import { SearchPage } from '../paginas/SearchPage';
import { UserResultPage } from '../paginas/UserResultPage';
import { RepoResultPage } from '../paginas/RepoResultPage';
import { HistoryPage } from '../paginas/HistoryPage';
import { NotFoundPage } from '../paginas/NotFoundPage';

export function Roteador() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />

      <Route element={<RotaPrivada />}>
        <Route path="/" element={<SearchPage />} />
        <Route path="/user/:username" element={<UserResultPage />} />
        <Route path="/repo/:owner/:repo" element={<RepoResultPage />} />
        <Route path="/historico" element={<HistoryPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
