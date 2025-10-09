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
    // 1. Consulta a placa no site que retorna dados FIPE (via proxy público)
    // Usando: http://api.fipeapi.com.br/v1/fipe/{fipe_code}?{token}
    // Mas como não temos token, vamos usar um proxy que já tem acesso
    // Exemplo: https://api-fipe-fi.vercel.app/api/price?code=001001-1
    // Mas vamos usar um serviço que funcione sem token

    // Vamos usar a API oficial via proxy: fipe.parallelum.com.br
    // Primeiro, vamos obter o código FIPE via scraping de tabelafipebrasil.com (não mais confiável)
    // Vamos mudar para uma API que aceite placa diretamente

    // Alternativa: usar o endpoint de busca por código FIPE
    // Exemplo: https://fipe.parallelum.com.br/api/v2/lookup/{fipe_code}
    // Mas não temos o código FIPE, apenas a placa

    // Nova estratégia:
    // Vamos usar o site: https://placafipe.com/placa/{placa}
    // Ele retorna JSON com dados FIPE
    // Mas isso não funciona no frontend (CORS), então usamos no backend

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
