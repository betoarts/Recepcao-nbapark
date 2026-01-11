import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Appointment, Employee } from '../types';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Loader2, Calendar, Search, User, Clock, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

interface AppointmentWithHost extends Appointment {
  host?: Pick<Employee, 'full_name' | 'photo_url'>;
}

export default function AllAppointments() {
  const [appointments, setAppointments] = useState<AppointmentWithHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [searchFilter, setSearchFilter] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    
    const startISO = startOfDay(new Date(startDate)).toISOString();
    const endISO = endOfDay(new Date(endDate)).toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        host:employees!host_id (
          full_name,
          photo_url
        )
      `)
      .gte('start_time', startISO)
      .lte('start_time', endISO)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setAppointments(data as AppointmentWithHost[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [startDate, endDate]);

  const filteredAppointments = appointments.filter(apt => {
    const search = searchFilter.toLowerCase();
    return (
      apt.title?.toLowerCase().includes(search) ||
      apt.guest_name?.toLowerCase().includes(search) ||
      apt.host?.full_name?.toLowerCase().includes(search)
    );
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'internal': return 'Interno';
      case 'external': return 'Externo';
      case 'personal': return 'Pessoal';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'internal': return 'bg-blue-100 text-blue-700';
      case 'external': return 'bg-purple-100 text-purple-700';
      case 'personal': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Todas as Reuniões</h1>
          <p className="text-gray-500">Consulte todos os agendamentos por data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-5 w-5 text-gray-400 hidden md:block" />
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 flex-1">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <span className="text-gray-400 hidden md:block self-end pb-3">até</span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 md:max-w-xs">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Título, visitante ou funcionário..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filteredAppointments.length} agendamentos encontrados</span>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum agendamento encontrado</p>
            <p className="text-sm">Tente ajustar os filtros de data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Funcionário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visitante</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {format(parseISO(apt.start_time), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 line-clamp-1">{apt.title}</p>
                      {apt.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{apt.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {apt.host?.photo_url ? (
                            <img src={apt.host.photo_url} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="text-gray-900">{apt.host?.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {apt.guest_name || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", getTypeColor(apt.type))}>
                        {getTypeLabel(apt.type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
