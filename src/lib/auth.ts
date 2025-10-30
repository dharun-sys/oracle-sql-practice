import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

type UserRecord = {
  id: string;
  password: string | null;
  student_name?: string | null;
  register_no?: string | null;
  is_admin?: boolean | null;
};
export async function findUserByRegister(registerNumber: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id,password,register_no,student_name,is_admin")
    .eq("register_no", registerNumber)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    password: data.password,
    student_name: data.student_name,
    register_no: data.register_no,
    is_admin: (data as any).is_admin ?? (data as any).isAdmin ?? null,
  };
}

export async function createPasswordForRegister(registerNumber: string, plainPassword: string) {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(plainPassword, saltRounds);

  const { data, error } = await supabase
    .from("users")
    .update({ password: hashed })
    .eq("register_no", registerNumber)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function verifyPasswordForRegister(registerNumber: string, plainPassword: string) {
  const user = await findUserByRegister(registerNumber);
  if (!user) return false;
  if (!user.password) return false;

  const match = await bcrypt.compare(plainPassword, user.password);
  return match;
}

export default {
  findUserByRegister,
  createPasswordForRegister,
  verifyPasswordForRegister,
};
