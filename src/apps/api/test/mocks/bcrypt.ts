export async function hash(value: string): Promise<string> {
  return `hashed:${value}`;
}

export async function compare(value: string, hashed: string): Promise<boolean> {
  return hashed === `hashed:${value}`;
}

const bcrypt = { hash, compare };
export default bcrypt;
