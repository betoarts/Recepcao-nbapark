import { createContext } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NotificationContextType {}

export const NotificationContext = createContext<NotificationContextType>({});
