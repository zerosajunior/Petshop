import Link from "next/link";

export default function RelatoriosPage() {
  return (
    <section>
      <h2>Relatórios</h2>
      <p className="subtle">Escolha o tipo de relatório gerencial.</p>

      <article className="panel">
        <div className="pageActions" style={{ marginBottom: 0 }}>
          <Link className="btnPrimary" href="/relatorios/operacional">
            Operacional do dia
          </Link>
          <Link className="btnSecondary" href="/relatorios/financeiro">
            Financeiro mensal
          </Link>
          <Link className="btnSecondary" href="/">
            Voltar ao painel
          </Link>
        </div>
      </article>
    </section>
  );
}
