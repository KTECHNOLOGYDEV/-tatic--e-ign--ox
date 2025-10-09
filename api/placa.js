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
    const url = `https://placafipe.com/placa/${clean}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Serviço indisponível' });
    }

    const html = await response.text();

    // === EXTRAÇÃO DOS DADOS COM REGEX ===
    const dados = {};

    // Marca
    const marcaMatch = html.match(/<td>\s*Marca:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.marca = marcaMatch ? marcaMatch[1].trim() : '—';

    // Modelo
    const modeloMatch = html.match(/<td>\s*Modelo:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.modelo = modeloMatch ? modeloMatch[1].trim() : '—';

    // Ano
    const anoMatch = html.match(/<td>\s*Ano:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.ano = anoMatch ? anoMatch[1].trim() : '—';

    // Combustível
    const combMatch = html.match(/<td>\s*Combustível:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.combustivel = combMatch ? combMatch[1].trim() : '—';

    // Cor
    const corMatch = html.match(/<td>\s*Cor:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.cor = corMatch ? corMatch[1].trim() : '—';

    // Chassi
    const chassiMatch = html.match(/<td>\s*Chassi:\s*<\/td>\s*<td>\s*\*+([^<\s]+)\s*<\/td>/i);
    dados.chassi = chassiMatch ? `...${chassiMatch[1].slice(-6)}` : '—';

    // Valor FIPE
    const valorMatch = html.match(/<td>R\$\s*([\d\.,]+)<\/td>/);
    dados.valor = valorMatch ? `R$ ${valorMatch[1].trim()}` : 'R$ —';

    // Código FIPE
    const codFipeMatch = html.match(/Código FIPE\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.codigo_fipe = codFipeMatch ? codFipeMatch[1].trim() : '—';

    // UF
    const ufMatch = html.match(/<td>\s*UF:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.uf = ufMatch ? ufMatch[1].trim() : '—';

    // Município
    const munMatch = html.match(/<td>\s*Município:\s*<\/td>\s*<td>([^<]+)<\/td>/i);
    dados.municipio = munMatch ? munMatch[1].trim() : '—';

    // Validação mínima
    if (!dados.valor || dados.valor === 'R$ —') {
      return res.status(404).json({ error: 'Placa não encontrada ou sem dados' });
    }

    res.status(200).json({
      placa: clean,
      marca: dados.marca,
      modelo: dados.modelo,
      ano: dados.ano,
      combustivel: dados.combustivel,
      cor: dados.cor,
      chassi: dados.chassi,
      valor: dados.valor,
      codigo_fipe: dados.codigo_fipe,
      uf: dados.uf,
      municipio: dados.municipio
    });

  } catch (err) {
    console.error('[SCRAPING ERROR]', err);
    res.status(500).json({ error: 'Erro interno ao consultar placa' });
  }
}
