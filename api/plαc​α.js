// api/plαc​α.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { placa } = req.query;
  if (!placa) {
    return res.status(400).json({ error: 'Parâmetro "placa" é obrigatório' });
  }

  const clean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const antiga = /^[A-Z]{3}[0-9]{4}$/;
  const mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  if (!antiga.test(clean) && !mercosul.test(clean)) {
    return res.status(400).json({ error: 'Formato de placa inválido' });
  }

  try {
    const url = `https://www.tabelafipebrasil.com/placa?placa=${clean}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({ error: 'Serviço indisponível' });
    }

    const html = await response.text();

    const valorMatch = html.match(/R\$[\s\d\.,]+/);
    const marcaMatch = html.match(/Marca:<\/strong>\s*([^<]+)/);
    const modeloMatch = html.match(/Modelo:<\/strong>\s*([^<]+)/);
    const anoMatch = html.match(/Ano:<\/strong>\s*([^<]+)/);
    const combustivelMatch = html.match(/Combustível:<\/strong>\s*([^<]+)/);

    const valor = valorMatch ? valorMatch[0].trim() : null;
    const marca = marcaMatch ? marcaMatch[1].trim() : null;
    const modelo = modeloMatch ? modeloMatch[1].trim() : null;
    const ano_modelo = anoMatch ? anoMatch[1].trim() : null;
    const combustivel = combustivelMatch ? combustivelMatch[1].trim() : null;

    if (!valor) {
      return res.status(404).json({ error: 'Placa não encontrada' });
    }

    res.status(200).json({
      valor,
      marca,
      modelo,
      ano_modelo,
      combustivel,
      placa: clean
    });

  } catch (err) {
    console.error('Erro no scraping:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
