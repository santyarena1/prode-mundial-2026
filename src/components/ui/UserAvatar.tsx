import { getAvatarPalette, getUserInitials } from "@/lib/user-avatar";

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
} as const;

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  seed?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function UserAvatar({
  firstName,
  lastName,
  seed,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initials = getUserInitials(firstName, lastName);
  const palette = getAvatarPalette(seed ?? `${firstName}${lastName}`);

  return (
    <div
      className={`rounded-full border flex items-center justify-center font-black uppercase shrink-0 ${palette.bg} ${palette.border} ${palette.text} ${SIZE_CLASSES[size]} ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
