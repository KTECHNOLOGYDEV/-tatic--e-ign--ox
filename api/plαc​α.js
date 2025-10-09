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
    // 1. Scraping para obter o código FIPE
    const url = `https://www.tabelafipebrasil.com/placa?placa=${clean}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({ error: 'Serviço indisponível' });
    }

    const html = await response.text();

    // Extrai o código FIPE
    const fipeCodeMatch = html.match(/Código FIPE:<\/strong>\s*([^<\s]+)/);
    if (!fipeCodeMatch) {
      return res.status(404).json({ error: 'Placa não encontrada ou sem código FIPE' });
    }

    const fipeCode = fipeCodeMatch[1].trim();

    // 2. Busca o valor oficial usando o código FIPE
    const fipeApiUrl = `https://fipe.parallelum.com.br/api/v2/lookup/${fipeCode}`;
    const fipeResponse = await fetch(fipeApiUrl);

    if (!fipeResponse.ok) {
      return res.status(500).json({ error: 'Erro ao obter dados da FIPE' });
    }

    const fipeData = await fipeResponse.json();

    if (!fipeData || !fipeData.price) {
      return res.status(404).json({ error: 'Dados da FIPE não encontrados' });
    }

    // Retorna os dados completos
    res.status(200).json({
      valor: fipeData.price || 'R$ —',
      marca: fipeData.brand || '—',
      modelo: fipeData.model || '—',
      ano_modelo: fipeData.modelYear || '—',
      combustivel: fipeData.fuel || '—',
      placa: clean
    });

  } catch (err) {
    console.error('Erro no scraping:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
