import { useEffect, useState } from 'react';
import { getUsers } from '../services/mockApi';

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Usuários da plataforma</h2>
      <div className="card overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light-gray text-left text-mid-gray">
              <th className="py-2">Nome</th>
              <th className="py-2">Email</th>
              <th className="py-2">Perfil</th>
              <th className="py-2">Area</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-light-gray">
                <td className="py-2">{user.name}</td>
                <td className="py-2">{user.email}</td>
                <td className="py-2">{user.role}</td>
                <td className="py-2">{user.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

