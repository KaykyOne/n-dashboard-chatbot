const formatNumber = (value: string) => {
  const pais = value.slice(0, 2);
  const area = value.slice(2, 4);
  const firstPart = value.slice(4, 9);
  const secondPart = value.slice(9, 13);
  return `+${pais} ${area} ${firstPart}-${secondPart}`;
}

export { formatNumber };