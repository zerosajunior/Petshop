import Link from "next/link";

type NavLink = {
  href: "/" | "/agenda" | "/cadastro" | "/servicos" | "/estoque" | "/promocoes" | "/relatorios";
  label: string;
};

const links: NavLink[] = [
  { href: "/", label: "Painel inicial" },
  { href: "/agenda", label: "Novo agendamento" },
  { href: "/cadastro", label: "Novo cadastro" },
  { href: "/servicos", label: "Serviços" },
  { href: "/estoque", label: "Novo produto" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/promocoes", label: "Nova campanha" }
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
