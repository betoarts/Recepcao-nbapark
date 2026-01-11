import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContextDef';

export function useNotification() {
  return useContext(NotificationContext);
}
