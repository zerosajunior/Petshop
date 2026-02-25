import Link from "next/link";

type NavLink = {
  href:
    | "/"
    | "/agenda"
    | "/cadastro"
    | "/servicos"
    | "/estoque"
    | "/movimentacoes-estoque"
    | "/promocoes"
    | "/relatorios"
    | "/privacidade";
  label: string;
};

const links: NavLink[] = [
  { href: "/", label: "Painel inicial" },
  { href: "/agenda", label: "Agendamentos" },
  { href: "/cadastro", label: "Cadastros" },
  { href: "/servicos", label: "Serviços" },
  { href: "/estoque", label: "Produtos" },
  { href: "/movimentacoes-estoque", label: "Estoque" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/promocoes", label: "Campanhas" },
  { href: "/privacidade", label: "Privacidade" }
];

export function Header() {
  return (
    <header className="header">
      <div>
        <h1>PetShop SaaS</h1>
        <p className="subtle">Agenda, estoque, promoções e avisos por SMS</p>
      </div>
      <nav className="nav" aria-label="ações rápidas">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
