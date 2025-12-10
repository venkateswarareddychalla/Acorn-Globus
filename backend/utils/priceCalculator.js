export function calculateTotal(basePrice, rules, bookingTime, equipmentCount, equipmentPrice, coachPrice) {
  let currentPrice = basePrice;
  const hour = bookingTime.getHours();
  const day = bookingTime.getDay(); // 0 = Sunday, 6 = Saturday

  // Apply pricing rules
  rules.forEach(rule => {
    if (rule.type === 'weekend' && (day === 0 || day === 6)) {
      if (rule.surcharge) currentPrice += rule.surcharge;
      if (rule.multiplier) currentPrice *= rule.multiplier;

    } else if (rule.type === 'peak_hour' && rule.start_time && rule.end_time) {
      const [startH, startM] = rule.start_time.split(':').map(Number);
      const [endH, endM] = rule.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const bookingMinutes = hour * 60 + bookingTime.getMinutes();
      if (bookingMinutes >= startMinutes && bookingMinutes < endMinutes) {
        if (rule.multiplier) currentPrice *= rule.multiplier;
        if (rule.surcharge) currentPrice += rule.surcharge;
      }
    }
  });

  // Add equipment costs
  currentPrice += equipmentCount * equipmentPrice;

  // Add coach cost
  if (coachPrice) currentPrice += coachPrice;

  return currentPrice;
}
