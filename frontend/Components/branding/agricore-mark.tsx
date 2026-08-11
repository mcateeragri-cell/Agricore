import Image from "next/image";

type AgriCoreMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function AgriCoreMark({
  size = 44,
  className = "",
  priority = false,
}: AgriCoreMarkProps) {
  return (
    <Image
      src="/agricore-icon.png"
      alt="AgriCore"
      width={size}
      height={size}
      className={`shrink-0 object-contain drop-shadow-[0_8px_18px_rgba(5,60,45,0.20)] ${className}`}
      priority={priority}
    />
  );
}
