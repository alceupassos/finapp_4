export default async function example(args: Record<string, unknown>) {
  const x = args['x'] as number || 1
  const y = args['y'] as number || 2
  return { sum: x + y }
}