
import { HelpCircle, Mail, Phone, MessageCircle } from 'lucide-react';

export default function Help() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Central de Ajuda</h1>
            <p className="text-gray-500">Suporte e informações úteis</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Perguntas Frequentes</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Como agendar uma reunião?
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Como alterar meu perfil?
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Como visualizar meus compromissos?
              </li>
            </ul>
          </div>
          
          <h3 className="font-semibold text-gray-900 pt-4">Contato</h3>
          <div className="grid gap-3">
            <a href="mailto:suporte@nbapark.com" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">humberto.neto@nbaparkgramado.com.br</span>
            </a>
            <a href="https://wa.me/+5554991680204?text=preciso%20de%20ajuda" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <Phone className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">(54) 99168-0204</span>
            </a>
            <button className="flex items-center gap-3 p-4 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors text-white">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Iniciar Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
