/**
 * Dashboard — Gerenciador de Finanças Pessoais
 *
 * Página principal que exibe e gerencia transações financeiras do usuário.
 * Consome a API REST Java (Spring Boot) em localhost:8080.
 *
 * Estratégia de layout:
 *  - Desktop (lg+): sidebar fixa, top bar, formulário lateral + tabela de extrato.
 *  - Mobile: header fixo, bottom nav, FAB + bottom sheet para nova transação.
 *
 * Funcionalidades:
 *  - CRUD completo de transações (criar, listar, editar, excluir).
 *  - Cards de resumo: receitas, despesas e saldo total.
 *  - Filtro por tipo (Todos / Receitas / Despesas) e busca por descrição.
 *  - Tema claro/escuro com persistência em localStorage.
 *  - Skeletons de carregamento para evitar layout shift.
 */
"use client";

// ── React ─────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

// ── Ícones ────────────────────────────────────────────────────────────────────
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Trash2,
  Plus,
  Search,
  TrendingUp,
  Inbox,
  Sun,
  Moon,
  Bell,
  BarChart3,
  User,
  LayoutDashboard,
  X,
  Settings,
  CreditCard,
  Pencil,
} from "lucide-react";

// ─────────────────────────────────── Types ────────────────────────────────────

/** Transação financeira conforme retornada pela API. */
interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  /** Data no formato ISO 8601 (YYYY-MM-DD). */
  data: string;
  tipo: "RECEITA" | "DESPESA";
}

type FiltroTipo = "TODOS" | "RECEITA" | "DESPESA";

// ──────────────────────────── Utilitários puros ───────────────────────────────

/**
 * Converte uma data ISO (YYYY-MM-DD) para o formato curto pt-BR.
 * Os componentes são parseados manualmente para evitar deslocamento de fuso horário
 * que ocorreria ao passar a string diretamente para `new Date()`.
 */
function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ano, mes - 1, dia));
}

/** Formata um número como decimal brasileiro (ex: 1234.5 → "1.234,50"). */
function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ──────────────────────────── Skeleton components ─────────────────────────────
// Exibidos durante o carregamento para evitar layout shift.

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700" />
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-24" />
      </div>
      <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded w-32 mb-1" />
      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-20" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50">
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse w-3/5" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse w-2/5" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse w-1/3" />
      </td>
      <td className="px-6 py-4">
        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse w-16" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse w-8 mx-auto" />
      </td>
    </tr>
  );
}

// ─────────────────────── Componente: TransactionForm ─────────────────────────
// Formulário de criação/edição — reutilizado na sidebar desktop e na bottom sheet mobile.

interface TransactionFormProps {
  editandoId: string | null;
  descricao: string;
  valor: string;
  data: string;
  tipo: "RECEITA" | "DESPESA";
  enviando: boolean;
  erroFormulario: string | null;
  onDescricaoChange: (value: string) => void;
  onValorChange: (value: string) => void;
  onDataChange: (value: string) => void;
  onTipoChange: (tipo: "RECEITA" | "DESPESA") => void;
  onSubmit: (e: { preventDefault(): void }) => void;
  onCancelar: () => void;
}

const INPUT_CLS =
  "w-full border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 dark:placeholder-[#94A3B8]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500 dark:focus-visible:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-700/50";

function TransactionForm({
  editandoId,
  descricao,
  valor,
  data,
  tipo,
  enviando,
  erroFormulario,
  onDescricaoChange,
  onValorChange,
  onDataChange,
  onTipoChange,
  onSubmit,
  onCancelar,
}: TransactionFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
          {editandoId ? (
            <Pencil className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
          )}
        </div>
        {editandoId ? "Editar Movimentação" : "Nova Movimentação"}
      </h3>

      {/* Tipo */}
      <div>
        <label className="block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wider">
          Tipo
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
          <button
            type="button"
            onClick={() => onTipoChange("RECEITA")}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-green-500/40 ${
              tipo === "RECEITA"
                ? "bg-white dark:bg-slate-600 text-[#22C55E] shadow-sm"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
            }`}
          >
            + Receita
          </button>
          <button
            type="button"
            onClick={() => onTipoChange("DESPESA")}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500/40 ${
              tipo === "DESPESA"
                ? "bg-white dark:bg-slate-600 text-[#EF4444] shadow-sm"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
            }`}
          >
            − Despesa
          </button>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wider">
          Descrição
        </label>
        <input
          type="text"
          value={descricao}
          onChange={(e) => onDescricaoChange(e.target.value)}
          placeholder="Ex: Mercado, Freelance..."
          className={INPUT_CLS}
        />
      </div>

      {/* Valor */}
      <div>
        <label className="block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wider">
          Valor (R$)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={valor}
          onChange={(e) => onValorChange(e.target.value)}
          placeholder="0,00"
          className={INPUT_CLS}
        />
      </div>

      {/* Data */}
      <div>
        <label className="block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wider">
          Data
        </label>
        <input
          type="date"
          value={data}
          onChange={(e) => onDataChange(e.target.value)}
          className={INPUT_CLS}
        />
      </div>

      {/* Feedback de erro */}
      {erroFormulario && (
        <p className="text-xs text-[#EF4444] dark:text-red-400 bg-[#FEE2E2] dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2.5">
          {erroFormulario}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        {enviando ? "Salvando..." : editandoId ? "Salvar Alterações" : "Adicionar Movimentação"}
      </button>

      {editandoId && (
        <button
          type="button"
          onClick={onCancelar}
          className="w-full mt-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-all duration-200"
        >
          Cancelar Edição
        </button>
      )}
    </form>
  );
}

// ───────────────────────────── Dashboard Page ─────────────────────────────────

export default function Home() {
  // ── Dados e carregamento ──────────────────────────────────────────────────
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Preferências de UI ───────────────────────────────────────────────────
  const [tema, setTema] = useState<"light" | "dark">("light");
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [navAtiva, setNavAtiva] = useState("dashboard");

  // ── Estado do formulário ─────────────────────────────────────────────────
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("RECEITA");
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // ── Filtros do extrato ───────────────────────────────────────────────────
  const [filtro, setFiltro] = useState<FiltroTipo>("TODOS");
  const [busca, setBusca] = useState("");

  // ── Efeitos ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("tema") as "light" | "dark" | null;
    if (saved) {
      setTema(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
  }, []);

  useEffect(() => {
    buscarTransacoes();
  }, []);

  // ── Handlers de dados ─────────────────────────────────────────────────────

  const buscarTransacoes = async () => {
    try {
      setLoading(true);
      const resposta = await fetch("http://localhost:8080/api/transacoes");
      if (!resposta.ok) throw new Error("Erro ao buscar dados");
      const dados = await resposta.json();
      setTransacoes(dados);
    } catch (error) {
      console.error("Erro na busca:", error);
    } finally {
      setLoading(false);
    }
  };

  const lidarComCadastro = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setErroFormulario(null);

    if (!descricao.trim() || !valor || !data) {
      setErroFormulario("Preencha todos os campos antes de continuar.");
      return;
    }

    try {
      setEnviando(true);

      // PUT para edição, POST para criação — reutiliza o mesmo formulário
      const url = editandoId
        ? `http://localhost:8080/api/transacoes/${editandoId}`
        : "http://localhost:8080/api/transacoes";

      const resposta = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao, valor: parseFloat(valor), data, tipo }),
      });

      if (!resposta.ok) throw new Error("Erro ao salvar transação");

      limparFormulario();
      setDrawerAberto(false);
      await buscarTransacoes();
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      setErroFormulario("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const lidarComExclusao = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta movimentação?")) return;
    try {
      const resposta = await fetch(`http://localhost:8080/api/transacoes/${id}`, {
        method: "DELETE",
      });
      if (!resposta.ok) throw new Error("Erro ao deletar transação");
      await buscarTransacoes();
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  // ── Handlers de formulário ────────────────────────────────────────────────

  /** Preenche o formulário com os dados da transação e ativa o modo edição. */
  const iniciarEdicao = (transacao: Transacao) => {
    setEditandoId(transacao.id);
    setDescricao(transacao.descricao);
    setValor(transacao.valor.toString());
    setData(transacao.data);
    setTipo(transacao.tipo);
    setDrawerAberto(true);
  };

  const limparFormulario = () => {
    setDescricao("");
    setValor("");
    setData("");
    setTipo("RECEITA");
    setEditandoId(null);
    setErroFormulario(null);
  };

  // ── Handlers de UI ────────────────────────────────────────────────────────

  const alternarTema = () => {
    const novo = tema === "light" ? "dark" : "light";
    setTema(novo);
    document.documentElement.classList.toggle("dark", novo === "dark");
    localStorage.setItem("tema", novo);
  };

  // ── Valores derivados ─────────────────────────────────────────────────────

  const totalEntradas = transacoes
    .filter((t) => t.tipo === "RECEITA")
    .reduce((acc, t) => acc + t.valor, 0);

  const totalSaidas = transacoes
    .filter((t) => t.tipo === "DESPESA")
    .reduce((acc, t) => acc + t.valor, 0);

  const saldoTotal = totalEntradas - totalSaidas;

  const transacoesFiltradas = transacoes
    .filter((t) => filtro === "TODOS" || t.tipo === filtro)
    .filter((t) => t.descricao.toLowerCase().includes(busca.toLowerCase()));

  // ── Configurações de navegação e filtros ──────────────────────────────────

  const abas: { label: string; value: FiltroTipo; count: number }[] = [
    { label: "Todos", value: "TODOS", count: transacoes.length },
    {
      label: "Receitas",
      value: "RECEITA",
      count: transacoes.filter((t) => t.tipo === "RECEITA").length,
    },
    {
      label: "Despesas",
      value: "DESPESA",
      count: transacoes.filter((t) => t.tipo === "DESPESA").length,
    },
  ];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transacoes", label: "Transações", icon: CreditCard },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  // Props do formulário compartilhadas entre sidebar desktop e bottom sheet mobile
  const formProps: TransactionFormProps = {
    editandoId,
    descricao,
    valor,
    data,
    tipo,
    enviando,
    erroFormulario,
    onDescricaoChange: (v) => { setDescricao(v); setErroFormulario(null); },
    onValorChange: (v) => { setValor(v); setErroFormulario(null); },
    onDataChange: (v) => { setData(v); setErroFormulario(null); },
    onTipoChange: setTipo,
    onSubmit: lidarComCadastro,
    onCancelar: limparFormulario,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-300">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white dark:bg-[#1E293B] border-r border-[#E2E8F0] dark:border-[#334155] z-20 transition-colors duration-300">
        <div className="px-6 py-6 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
                FinanceApp
              </h1>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Dashboard pessoal
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const ativo = navAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNavAtiva(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  ativo
                    ? "bg-blue-50 dark:bg-blue-500/10 text-[#2563EB] dark:text-blue-400"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                {ativo && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-[#2563EB] dark:text-blue-400 rounded-full font-bold">
                    Ativo
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#E2E8F0] dark:border-[#334155] space-y-0.5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 text-left">
            <Settings className="w-4 h-4 shrink-0" />
            Configurações
          </button>
          <button
            onClick={alternarTema}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 text-left"
          >
            {tema === "light" ? (
              <Moon className="w-4 h-4 shrink-0" />
            ) : (
              <Sun className="w-4 h-4 shrink-0" />
            )}
            {tema === "light" ? "Modo Escuro" : "Modo Claro"}
          </button>
        </div>
      </aside>

      {/* ── CONTENT WRAPPER ── */}
      <div className="lg:ml-64 flex flex-col min-h-screen">

        {/* ── MOBILE HEADER ── */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-white dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-300">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/30">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                FinanceApp
              </span>
            </div>

            <div
              className={`flex-1 text-center text-sm font-bold px-3 py-1.5 rounded-full truncate ${
                saldoTotal >= 0
                  ? "text-[#15803D] bg-[#DBEAFE] dark:text-green-400 dark:bg-green-500/10"
                  : "text-[#B91C1C] bg-red-100 dark:text-red-400 dark:bg-red-500/10"
              }`}
            >
              R$ {formatarMoeda(Math.abs(saldoTotal))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={alternarTema}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                {tema === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </button>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                  JD
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── DESKTOP TOP BAR ── */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] transition-colors duration-300">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Dashboard
            </h2>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Painel financeiro pessoal
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={alternarTema}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] border border-[#E2E8F0] dark:border-[#334155] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              {tema === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] border border-[#E2E8F0] dark:border-[#334155] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#2563EB] rounded-full" />
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E2E8F0] dark:border-[#334155]">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                  JD
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
                  João Doe
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Conta pessoal
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 px-4 lg:px-8 pt-20 pb-28 lg:pt-8 lg:pb-10 space-y-6">

          {/* Cards de resumo financeiro */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#DCFCE7] dark:bg-green-500/10 rounded-2xl border border-green-100 dark:border-green-500/20 p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:shadow-green-500/10">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-green-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <ArrowUpCircle className="w-6 h-6 text-[#22C55E]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-0.5">
                  Receitas
                </p>
                <p className="text-xl font-bold text-green-800 dark:text-green-300 truncate">
                  R$ {formatarMoeda(totalEntradas)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                  {transacoes.filter((t) => t.tipo === "RECEITA").length} entradas
                </p>
              </div>
            </div>

            <div className="bg-[#FEE2E2] dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:shadow-red-500/10">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-red-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <ArrowDownCircle className="w-6 h-6 text-[#EF4444]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-0.5">
                  Despesas
                </p>
                <p className="text-xl font-bold text-red-800 dark:text-red-300 truncate">
                  R$ {formatarMoeda(totalSaidas)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                  {transacoes.filter((t) => t.tipo === "DESPESA").length} saídas
                </p>
              </div>
            </div>

            <div className="bg-[#DBEAFE] dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:shadow-blue-500/10">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-blue-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <Wallet
                  className={`w-6 h-6 ${
                    saldoTotal >= 0
                      ? "text-[#2563EB] dark:text-blue-400"
                      : "text-[#B91C1C] dark:text-red-400"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-0.5">
                  Saldo Total
                </p>
                <p
                  className={`text-xl font-bold truncate ${
                    saldoTotal >= 0
                      ? "text-[#15803D] dark:text-blue-300"
                      : "text-[#B91C1C] dark:text-red-300"
                  }`}
                >
                  {saldoTotal < 0 ? "−" : ""} R$ {formatarMoeda(Math.abs(saldoTotal))}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                  {transacoes.length} no total
                </p>
              </div>
            </div>
          </section>

          {/* Grade principal: formulário (desktop) + extrato */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Formulário — apenas desktop (mobile usa bottom sheet) */}
            <section className="hidden lg:block lg:col-span-4 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm p-6 transition-colors duration-300">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {editandoId ? "Editar Movimentação" : "Nova Movimentação"}
                </h3>
                <button
                  onClick={limparFormulario}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <TransactionForm {...formProps} />
            </section>

            {/* Extrato de transações */}
            <section className="lg:col-span-8 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm overflow-hidden transition-colors duration-300">

              {/* Cabeçalho do extrato: abas de filtro + busca */}
              <div className="px-5 pt-5 pb-4 border-b border-[#E2E8F0] dark:border-[#334155] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Extrato
                  </h3>
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {transacoesFiltradas.length}{" "}
                    {transacoesFiltradas.length === 1 ? "transação" : "transações"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl shrink-0">
                    {abas.map((aba) => (
                      <button
                        key={aba.value}
                        onClick={() => setFiltro(aba.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                          filtro === aba.value
                            ? "bg-white dark:bg-slate-600 text-[#0F172A] dark:text-[#F8FAFC] shadow-sm"
                            : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                        }`}
                      >
                        {aba.label}
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs ${
                            filtro === aba.value
                              ? "bg-slate-100 dark:bg-slate-500 text-slate-600 dark:text-slate-200"
                              : "bg-slate-200/70 dark:bg-slate-600/50 text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {aba.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar por descrição..."
                      className="w-full pl-9 pr-3.5 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/60 dark:placeholder-[#94A3B8]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500 dark:focus-visible:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-700/30"
                    />
                  </div>
                </div>
              </div>

              {/* Corpo do extrato: skeleton / empty state / lista */}
              {loading ? (
                <>
                  <div className="lg:hidden p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <SkeletonRow key={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : transacoesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                    <Inbox className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                    {busca ? "Nenhum resultado" : "Tudo limpo por aqui!"}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-xs">
                    {busca
                      ? `Nenhuma transação com "${busca}". Tente outro termo.`
                      : "Cadastre sua primeira movimentação."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile: lista em cards */}
                  <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                    {transacoesFiltradas.map((transacao) => {
                      const estaEditando = editandoId === transacao.id;
                      return (
                        <div
                          key={transacao.id}
                          className={`flex items-center gap-3 px-4 py-3.5 transition-all duration-200 group ${
                            estaEditando
                              ? "bg-blue-50/80 dark:bg-blue-500/10 border-l-4 border-[#2563EB] dark:border-blue-400"
                              : "hover:bg-[#F1F5F9] dark:hover:bg-[#273449]"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              transacao.tipo === "RECEITA"
                                ? "bg-[#DCFCE7] dark:bg-green-500/20"
                                : "bg-[#FEE2E2] dark:bg-red-500/20"
                            }`}
                          >
                            {transacao.tipo === "RECEITA" ? (
                              <ArrowUpCircle className="w-4 h-4 text-[#22C55E]" />
                            ) : (
                              <ArrowDownCircle className="w-4 h-4 text-[#EF4444]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                                {transacao.descricao}
                              </p>
                              {estaEditando && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-500/30 text-[#2563EB] dark:text-blue-400 px-1.5 py-0.5 rounded-md font-bold shrink-0 animate-pulse">
                                  Editando
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                              {formatarData(transacao.data)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-sm font-bold mr-1 ${
                                transacao.tipo === "RECEITA"
                                  ? "text-[#22C55E]"
                                  : "text-[#EF4444]"
                              }`}
                            >
                              {transacao.tipo === "RECEITA" ? "+" : "−"} R${" "}
                              {formatarMoeda(transacao.valor)}
                            </span>
                            <button
                              onClick={() => iniciarEdicao(transacao)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                estaEditando
                                  ? "text-[#2563EB] dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20"
                                  : "text-slate-400 dark:text-slate-500 hover:text-[#2563EB] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              }`}
                              title="Editar transação"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => lidarComExclusao(transacao.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-[#EF4444] dark:hover:text-red-400 hover:bg-[#FEE2E2] dark:hover:bg-red-500/10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500/40"
                              title="Excluir transação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: tabela */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-700/20 border-b border-[#E2E8F0] dark:border-[#334155]">
                          {["Descrição", "Valor", "Data", "Tipo", "Ações"].map((col) => (
                            <th
                              key={col}
                              className={`px-6 py-3.5 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider${col === "Ações" ? " text-center" : ""}`}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                        {transacoesFiltradas.map((transacao) => {
                          const estaEditando = editandoId === transacao.id;
                          return (
                            <tr
                              key={transacao.id}
                              className={`group transition-colors duration-150 ${
                                estaEditando
                                  ? "bg-blue-50/40 dark:bg-blue-500/5 border-l-4 border-[#2563EB] dark:border-blue-400"
                                  : "hover:bg-[#F1F5F9] dark:hover:bg-[#273449]"
                              }`}
                            >
                              <td className="px-6 py-4 text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                <div className="flex items-center gap-2">
                                  {transacao.descricao}
                                  {estaEditando && (
                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-500/30 text-[#2563EB] dark:text-blue-400 px-1.5 py-0.5 rounded-md font-bold animate-pulse">
                                      Editando
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td
                                className={`px-6 py-4 text-sm font-bold ${
                                  transacao.tipo === "RECEITA"
                                    ? "text-[#22C55E]"
                                    : "text-[#EF4444]"
                                }`}
                              >
                                {transacao.tipo === "RECEITA" ? "+" : "−"} R${" "}
                                {formatarMoeda(transacao.valor)}
                              </td>
                              <td className="px-6 py-4 text-sm text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                                {formatarData(transacao.data)}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                    transacao.tipo === "RECEITA"
                                      ? "bg-[#DCFCE7] dark:bg-green-500/10 text-[#22C55E] border-green-200 dark:border-green-500/20"
                                      : "bg-[#FEE2E2] dark:bg-red-500/10 text-[#EF4444] border-red-200 dark:border-red-500/20"
                                  }`}
                                >
                                  {transacao.tipo === "RECEITA" ? "Receita" : "Despesa"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2 mx-auto">
                                  <button
                                    onClick={() => iniciarEdicao(transacao)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                                      estaEditando
                                        ? "text-[#2563EB] dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20"
                                        : "opacity-70 hover:opacity-100 text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                    }`}
                                    title="Editar transação"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => lidarComExclusao(transacao.id)}
                                    className="opacity-70 hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#EF4444] dark:hover:text-red-400 hover:bg-[#FEE2E2] dark:hover:bg-red-500/10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500/40"
                                    title="Excluir transação"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* ── MOBILE FAB — abre a bottom sheet de nova transação ── */}
      <button
        onClick={() => setDrawerAberto(true)}
        className="lg:hidden fixed bottom-20 right-5 w-14 h-14 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 transition-all duration-200 z-20 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
        aria-label="Nova movimentação"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ── MOBILE BOTTOM SHEET ── */}
      {drawerAberto && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerAberto(false)}
          />
          <div className="relative bg-white dark:bg-[#1E293B] rounded-t-3xl border-t border-[#E2E8F0] dark:border-[#334155] px-5 pt-3 pb-10 max-h-[92dvh] overflow-y-auto transition-colors duration-300">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {editandoId ? "Editar Movimentação" : "Nova Movimentação"}
              </h3>
              <button
                onClick={() => setDrawerAberto(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#273449] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <TransactionForm {...formProps} />
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-[#334155] transition-colors duration-300">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const ativo = navAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNavAtiva(item.id)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  ativo
                    ? "text-[#2563EB] dark:text-blue-400"
                    : "text-[#64748B] dark:text-[#94A3B8]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
