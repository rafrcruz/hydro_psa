import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Filter, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  clearNotifications,
  getNotificationEventName,
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/mockApi';

function formatDateTime(value) {
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getRequestDetailPath(profile, requestId) {
  if (profile === 'Solicitante') {
    return `/solicitante/chamados/${requestId}`;
  }
  if (profile === 'Executor') {
    return `/executor/chamados/${requestId}`;
  }
  if (profile === 'Automa\u00e7\u00e3o') {
    return `/automacao/chamados/${requestId}`;
  }
  return '';
}

export default function NotificationCenter({ profile, currentUserId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const notificationEventName = useMemo(() => getNotificationEventName(), []);
  const canShow = profile !== 'Gest\u00e3o';

  const refreshUnreadCount = useCallback(async () => {
    if (!canShow) {
      setUnreadCount(0);
      return;
    }
    const count = await getUnreadNotificationsCount(profile, currentUserId);
    setUnreadCount(count);
  }, [canShow, profile, currentUserId]);

  const refreshList = useCallback(async (nextFilter = filter) => {
    if (!canShow) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await getNotifications(profile, currentUserId, nextFilter);
      setNotifications(rows);
    } finally {
      setLoading(false);
    }
  }, [canShow, profile, currentUserId, filter]);

  useEffect(() => {
    setOpen(false);
    setFilter('ALL');
    setNotifications([]);
    refreshUnreadCount();
  }, [profile, currentUserId, refreshUnreadCount]);

  useEffect(() => {
    const onNotificationsChanged = () => {
      refreshUnreadCount();
      if (open) {
        refreshList(filter);
      }
    };

    window.addEventListener(notificationEventName, onNotificationsChanged);
    return () => {
      window.removeEventListener(notificationEventName, onNotificationsChanged);
    };
  }, [filter, open, notificationEventName, refreshList, refreshUnreadCount]);

  const onToggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await refreshList(filter);
      await refreshUnreadCount();
    }
  };

  const onFilterChange = async (nextFilter) => {
    setFilter(nextFilter);
    await refreshList(nextFilter);
  };

  const onMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(profile, currentUserId);
    await refreshList(filter);
    await refreshUnreadCount();
  };

  const onClearAll = async () => {
    const confirmed = window.confirm('Deseja limpar todas as notificações deste perfil?');
    if (!confirmed) {
      return;
    }
    await clearNotifications(profile, currentUserId);
    await refreshList(filter);
    await refreshUnreadCount();
  };

  const onOpenNotification = async (item) => {
    await markNotificationAsRead(item.id, currentUserId);
    await refreshUnreadCount();
    const destination = getRequestDetailPath(profile, item.requestId);
    if (destination) {
      navigate(destination);
      setOpen(false);
    }
  };

  const onMarkAsRead = async (itemId) => {
    await markNotificationAsRead(itemId, currentUserId);
    await refreshList(filter);
    await refreshUnreadCount();
  };

  if (!canShow) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleOpen}
        className="relative rounded-lg border border-light-gray bg-white px-3 py-2 text-hydro-blue hover:bg-light-gray"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-bauxite px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,430px)] rounded-xl border border-light-gray bg-white shadow-xl">
          <div className="border-b border-light-gray p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg text-hydro-blue">Notificações</h3>
              <span className="rounded bg-light-gray px-2 py-1 text-xs text-mid-gray">
                {unreadCount} não lidas
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => onFilterChange('ALL')}>
                <Filter className="h-4 w-4" />
                Todas
              </button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => onFilterChange('UNREAD')}>
                <Filter className="h-4 w-4" />
                Não lidas
              </button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={onMarkAllAsRead}>
                <CheckCheck className="h-4 w-4" />
                Marcar todas
              </button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={onClearAll}>
                <Trash2 className="h-4 w-4" />
                Limpar
              </button>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {loading ? (
              <p className="px-2 py-3 text-sm text-aluminium">Carregando notificações...</p>
            ) : !notifications.length ? (
              <p className="px-2 py-3 text-sm text-aluminium">Nenhuma notificação para o filtro selecionado.</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 ${
                      item.read ? 'border-light-gray bg-white' : 'border-hydro-light-blue bg-hydro-light-blue/10'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => onOpenNotification(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-hydro-blue">{item.title}</p>
                        {!item.read ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-bauxite" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-mid-gray">{item.summary}</p>
                      <p className="mt-1 text-xs text-aluminium">
                        {item.requestId} - {item.requestTitle}
                      </p>
                      <p className="mt-1 text-xs text-aluminium">
                        {item.actorName || 'Sistema'} ({item.actorRole || 'Sistema'}) - {formatDateTime(item.createdAt)}
                      </p>
                    </button>

                    {!item.read ? (
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-hydro-blue underline"
                        onClick={() => onMarkAsRead(item.id)}
                      >
                        Marcar como lida
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
