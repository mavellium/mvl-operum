import React, { forwardRef } from 'react';

// Tipagens para os dados que virão do seu sistema
interface Stakeholder {
  ref: string;
  nome: string;
  empresa: string;
  cargo: string;
  email: string;
  telefone: string;
  endereco: string;
  observacoes: string;
}

interface ProjetoHeader {
  departamento: string;
  semestreAno: string;
  nomeProjeto: string;
  gerente: string;
  elaboradoPor: string;
  aprovadoPor: string;
  versao: string;
  dataAprovacao: string;
}

interface DocumentProps {
  projeto: ProjetoHeader;
  stakeholders: Stakeholder[];
}

// Usamos forwardRef para permitir que o react-to-print capture este componente
const StakeholderDocument = forwardRef<HTMLDivElement, DocumentProps>(
  ({ projeto, stakeholders }, ref) => {
    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-10 font-sans mx-auto"
        style={{ width: '210mm', minHeight: '297mm' }} // Tamanho A4 exato
      >
        {/* Cabeçalho do Documento */}
        <div className="flex flex-col items-center mb-6">
          {/* Espaço para a Logo do Girassol */}
          <div className="w-40 h-40 mb-2 border border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-gray-400 text-xs text-center">
              [Sua Logo Girassol Aqui]
            </span>
            {/* Quando tiver a logo, use: <img src="/logo.png" alt="Girassol em Ação" className="w-full object-contain" /> */}
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wide">
            Formulário de Stakeholder – Partes Interessadas
          </h1>
        </div>

        {/* Tabela 1: Informações do Projeto */}
        <table className="w-full border-collapse border border-black text-sm mb-8">
          <tbody>
            <tr>
              <td colSpan={4} className="border border-black p-2 text-center font-bold bg-gray-50">
                Stakeholder externo - {projeto.departamento} - {projeto.semestreAno}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold w-1/4 bg-gray-50">Nome do projeto:</td>
              <td colSpan={3} className="border border-black p-2">{projeto.nomeProjeto}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-50">Gerente do projeto:</td>
              <td colSpan={3} className="border border-black p-2">{projeto.gerente}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-50">Elaborado por:</td>
              <td colSpan={3} className="border border-black p-2">{projeto.elaboradoPor}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-50">Aprovado por:</td>
              <td className="border border-black p-2">{projeto.aprovadoPor}</td>
              <td className="border border-black p-2 font-bold w-[10%] bg-gray-50">Versão:</td>
              <td className="border border-black p-2 w-[15%]">{projeto.versao}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-50">Assinatura:</td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2 font-bold bg-gray-50">Data de aprovação:</td>
              <td className="border border-black p-2">{projeto.dataAprovacao}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabela 2: Lista de Stakeholders */}
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-black p-2 w-8">Ref.</th>
              <th className="border border-black p-2">Nome</th>
              <th className="border border-black p-2">Empresa/Equipe</th>
              <th className="border border-black p-2">Cargo/Competência</th>
              <th className="border border-black p-2">e-mail</th>
              <th className="border border-black p-2">Telefone/Fax</th>
              <th className="border border-black p-2 w-32">Endereço</th>
              <th className="border border-black p-2">Observações</th>
            </tr>
          </thead>
          <tbody>
            {stakeholders.map((sh, index) => (
              <tr key={index}>
                <td className="border border-black p-2 text-center">{sh.ref}</td>
                <td className="border border-black p-2">{sh.nome}</td>
                <td className="border border-black p-2">{sh.empresa}</td>
                <td className="border border-black p-2">{sh.cargo}</td>
                <td className="border border-black p-2 break-all">{sh.email}</td>
                <td className="border border-black p-2 whitespace-nowrap">{sh.telefone}</td>
                <td className="border border-black p-2">{sh.endereco}</td>
                <td className="border border-black p-2">{sh.observacoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

StakeholderDocument.displayName = 'StakeholderDocument';
export default StakeholderDocument;