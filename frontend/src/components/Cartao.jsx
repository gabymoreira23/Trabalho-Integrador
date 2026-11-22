export default function Cartao({ titulo, children }) {
  return (
    <section className="cartao">
      {titulo && <h2 className="cartao__titulo">{titulo}</h2>}
      {children}
    </section>
  );
}
