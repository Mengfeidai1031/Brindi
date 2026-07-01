interface ShareLine {
  name: string;
  amount: string;
}

interface ShareTextOptions {
  title: string;
  totalLabel: string;
  totalAmount: string;
  lines: ShareLine[];
  payLabel?: string;
  payLink?: string | null;
}

/** Compone el mensaje de texto plano para compartir (Web Share API / portapapeles). */
export function buildShareText(options: ShareTextOptions): string {
  const { title, totalLabel, totalAmount, lines, payLabel, payLink } = options;
  const blocks: string[] = [];
  blocks.push(`${title}\n${totalLabel}: ${totalAmount}`);
  blocks.push(lines.map((l) => `${l.name}: ${l.amount}`).join('\n'));
  if (payLink && payLabel) {
    blocks.push(`${payLabel}: ${payLink}`);
  }
  return blocks.join('\n\n');
}
