export default function PrivacidadePage() {
  return (
    <section>
      <h2>Política de Privacidade</h2>
      <p className="subtle">
        Esta página resume como os dados pessoais são tratados no sistema, em alinhamento à LGPD.
      </p>

      <article className="panel">
        <h3>Dados coletados</h3>
        <ul className="listSimple">
          <li>Clientes: nome, telefone, e-mail (opcional) e canal preferido.</li>
          <li>Pets: nome, tipo e informações de agendamento vinculadas ao cliente.</li>
          <li>Mensagens: canal, conteúdo e status de envio.</li>
        </ul>

        <h3>Finalidade</h3>
        <ul className="listSimple">
          <li>Execução do serviço de agendamento e comunicação operacional.</li>
          <li>Gestão de relacionamento com clientes e histórico de atendimento.</li>
          <li>Campanhas promocionais apenas com consentimento de marketing.</li>
        </ul>

        <h3>Base legal</h3>
        <ul className="listSimple">
          <li>Execução de contrato para cadastros e agendamentos.</li>
          <li>Consentimento para comunicações promocionais.</li>
          <li>Cumprimento de obrigação legal quando aplicável.</li>
        </ul>

        <h3>Direitos do titular</h3>
        <ul className="listSimple">
          <li>Acesso e exportação dos dados pessoais.</li>
          <li>Correção de dados incompletos ou desatualizados.</li>
          <li>Anonimização dos dados, quando cabível.</li>
          <li>Revogação do consentimento de marketing a qualquer tempo.</li>
        </ul>

        <h3>Como solicitar</h3>
        <p>
          Use os endpoints administrativos de privacidade para exportação ou anonimização do titular:
          <code> /api/privacy/customers/[id]</code>.
        </p>
      </article>
    </section>
  );
}
