"use server";

import { z } from "zod";

const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });

export async function signup(formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    repeatPassword: formData.get("repeatPassword"),
  };

  const result = signupSchema.safeParse(rawData);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return {
      error: errors.email?.[0] || errors.password?.[0] || errors.repeatPassword?.[0] || "Validation failed"
    };
  }

  const { email, password } = result.data;

  console.log("Signup credentials:", { email, password });

  // TODO: Implement actual signup logic (database, password hashing, etc.)

  return { success: true };
}
