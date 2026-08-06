import { Link } from "@tanstack/react-router";
import {
  Bell,
  BookMarked,
  CheckCircle2,
  Clock3,
  Heart,
  ListPlus,
  LockKeyhole,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { ProductState } from "@/components/product-states";
import { catalog } from "@/services/catalog-service";
const meta = {
  biblioteca: [
    BookMarked,
    "Minha biblioteca",
    "Acompanhe suas leituras e veja o que recebeu capítulos novos.",
  ],
  favoritos: [Heart, "Favoritos", "Obras que você quer manter sempre por perto."],
  listas: [ListPlus, "Minhas listas", "Organize obras por tema, prioridade ou ocasião."],
  historico: [Clock3, "Histórico", "Continue exatamente do ponto em que parou."],
  perfil: [User, "Seu perfil", "Preferências e atividade da sua conta."],
  configuracoes: [
    Settings,
    "Configurações",
    "Aparência, privacidade, fontes e preferências de leitura.",
  ],
  notificacoes: [Bell, "Notificações", "Atualizações de capítulos, fontes e sistema."],
  admin: [
    ShieldCheck,
    "Administração",
    "Saúde do catálogo, provedores e processamento do servidor.",
  ],
} as const;
export type AccountSection = keyof typeof meta;
export function AccountPage({ section }: { section: AccountSection }) {
  const [Icon, title, description] = meta[section];
  return (
    <main className="page-shell pb-28">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Icon />
            {section === "admin" ? "Área restrita" : "Espaço pessoal"}
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {section === "biblioteca" || section === "favoritos" || section === "historico" ? (
        <div className="catalog-grid">
          {catalog
            .filter((x) => section !== "favoritos" || x.rating >= 4.7)
            .slice(0, 4)
            .map((x) => (
              <MangaCard manga={x} key={x.id} />
            ))}
        </div>
      ) : section === "listas" ? (
        <div className="dashboard-grid">
          <ListCard title="Quero ler" count={8} />
          <ListCard title="Favoritos de fantasia" count={12} />
          <ListCard title="Concluídos em 2026" count={4} />
          <button className="new-list">
            <ListPlus />
            Criar nova lista
          </button>
        </div>
      ) : section === "configuracoes" ? (
        <SettingsPanel />
      ) : section === "notificacoes" ? (
        <div className="stack-list">
          <Notice
            title="Novo capítulo disponível"
            text="A Herdeira da Lua recebeu o capítulo 84."
          />
          <Notice
            title="Fonte alternativa ativada"
            text="MangaDex assumiu temporariamente a obra Rosas de Inverno."
          />
          <Notice title="Sincronização concluída" text="Seu progresso foi salvo no servidor." />
        </div>
      ) : section === "admin" ? (
        <AdminPanel />
      ) : section === "perfil" ? (
        <div className="profile-card">
          <div className="profile-avatar">Y</div>
          <div>
            <h2>Leitor Yae</h2>
            <p>Conta pessoal · membro desde 2026</p>
          </div>
          <Link to="/configuracoes" className="secondary-button">
            Editar preferências
          </Link>
        </div>
      ) : (
        <ProductState state="empty" />
      )}
    </main>
  );
}
function ListCard({ title, count }: { title: string; count: number }) {
  return (
    <button className="list-card">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
        <BookMarked />
      </span>
      <strong>{title}</strong>
      <small>{count} obras</small>
    </button>
  );
}
function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="notice">
      <CheckCircle2 />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <span>Agora</span>
    </div>
  );
}
function SettingsPanel() {
  return (
    <div className="settings-grid">
      <section className="side-card">
        <h2>Aparência e leitura</h2>
        <Setting title="Tema do aplicativo" value="Seguir preferência do dispositivo" />
        <Setting title="Direção de leitura" value="Direita para esquerda" />
        <Setting title="Pré-carregar páginas" value="2 páginas" />
      </section>
      <section className="side-card">
        <h2>Conteúdo e privacidade</h2>
        <Setting title="Conteúdo adulto" value="Confirmar antes de abrir" />
        <Setting title="Histórico" value="Salvar no servidor" />
        <Setting title="Dados offline" value="Somente favoritos" />
      </section>
      <section className="side-card">
        <h2>Fontes</h2>
        <Setting title="Biblioteca local" value="Principal · conectada" />
        <Setting title="MangaDex" value="Alternativa · conectada" />
        <Setting title="Suwayomi" value="Requer atenção" />
      </section>
    </div>
  );
}
function Setting({ title, value }: { title: string; value: string }) {
  return (
    <button className="setting-row">
      <div>
        <strong>{title}</strong>
        <span>{value}</span>
      </div>
      <span>›</span>
    </button>
  );
}
function AdminPanel() {
  return (
    <>
      <div className="metrics">
        <div>
          <span>Obras indexadas</span>
          <strong>1.248</strong>
        </div>
        <div>
          <span>Capítulos locais</span>
          <strong>8.532</strong>
        </div>
        <div>
          <span>Fontes saudáveis</span>
          <strong>3/4</strong>
        </div>
        <div>
          <span>Fila de atualização</span>
          <strong>12</strong>
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="side-card">
          <h2>Saúde dos provedores</h2>
          <Notice title="Biblioteca local" text="Operacional · resposta em 42 ms" />
          <Notice title="MangaDex" text="Operacional · fallback disponível" />
        </section>
        <section className="side-card">
          <h2>Segurança</h2>
          <div className="state-panel compact">
            <LockKeyhole />
            <h2>Operações protegidas</h2>
            <p>
              Importações, exclusões e credenciais ficam no backend. O navegador recebe apenas
              permissões e resultados.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
