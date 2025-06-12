import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { API_URL } from "@/config/env";
import { Formatter } from "@/utils/formatter";
import { User, UserWithToken } from "@/types/user";
import { JWT_TOKEN, USER_TOKEN } from "@/config/ls-token";

type AuthContextType = {
  user: User | null;
  updateUser: (user: User) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_TOKEN);

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const url = new URL(`${API_URL}/auth/customer/login`);
      const requestBody = JSON.stringify({ email, password });

      const response = await fetch(url, {
        method: "POST",
        body: requestBody,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseBody = await response.json() as UserWithToken;

      if (response.status !== 200) {
        const errorMessage = Formatter.errorMessage(responseBody, "Erro ao fazer login.");

        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      setUser(responseBody);

      const userPersistentData = {
        id: responseBody.id,
        name: responseBody.name,
        email: responseBody.email,
      }

      localStorage.setItem(USER_TOKEN, JSON.stringify(userPersistentData));
      localStorage.setItem(JWT_TOKEN, responseBody.token);

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${responseBody.name}!`,
      });

      return true;
    } catch {
      toast({
        title: "Erro no login",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const url = new URL(`${API_URL}/auth/customer/register`);
      const requestBody = JSON.stringify({ name, email, password });

      const response = await fetch(url, {
        method: "POST",
        body: requestBody,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseBody = await response.json() as UserWithToken;

      if (response.status !== 201) {
        const errorMessage = Formatter.errorMessage(responseBody, "Erro ao cadastrar usuário.");

        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      setUser(responseBody);

      const userPersistentData = {
        id: responseBody.id,
        name: responseBody.name,
        email: responseBody.email,
      }

      localStorage.setItem(USER_TOKEN, JSON.stringify(userPersistentData));
      localStorage.setItem(JWT_TOKEN, responseBody.token);

      toast({
        title: "Cadastro realizado com sucesso!",
        description: `Bem-vindo, ${name}!`,
      });

      return true;
    } catch {
      toast({
        title: "Erro no cadastro",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);

    localStorage.removeItem(USER_TOKEN);
    localStorage.removeItem(JWT_TOKEN);

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  const updateUser = (user: User) => {
    setUser(user);
    localStorage.setItem(USER_TOKEN, JSON.stringify(user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
