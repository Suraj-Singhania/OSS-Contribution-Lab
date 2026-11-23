"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export function ProfileArea() {
  const { user } = useUser();
  const name = user?.fullName ?? user?.username ?? user?.firstName ?? "User";

  return (
    <div className="flex w-full items-center justify-between">
      <span className="text-foreground flex justify-evenly text-base font-medium">
        Welcome, {name}
      </span>
      <UserButton />
    </div>
  );
}
