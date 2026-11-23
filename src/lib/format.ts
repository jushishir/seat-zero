// পয়সা (minor units) থেকে আসল টাকায় রূপান্তর: 50000 -> "৳500"
export function formatPrice(priceMinor: number, currency = 'BDT'): string {
  const amount = priceMinor / 100;

  if (currency === 'BDT') {
    return `৳${amount.toLocaleString('en-BD')}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// বাংলাদেশের সময় অনুযায়ী তারিখ ফরম্যাট: "Sat, Dec 5, 7:00 PM"
export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
