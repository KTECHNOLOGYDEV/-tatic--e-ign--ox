// api/placa.js
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
    // Faz a requisição para placafipe.com
    const url = `https://placafipe.com/placa/${clean}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Serviço indisponível' });
    }

    const data = await response.json();

    if (!data || !data.valor) {
      return res.status(404).json({ error: 'Placa não encontrada' });
    }

    // Retorna os dados formatados
    res.status(200).json({
      valor: data.valor || 'R$ —',
      marca: data.marca || '—',
      modelo: data.modelo || '—',
      ano_modelo: data.ano_modelo || '—',
      combustivel: data.combustivel || '—',
      placa: clean
    });

  } catch (err) {
    console.error('Erro no scraping:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
