import { useAppIcon } from "./Icons";

export default function DeleteIconButton({
  onClick,
  title = "Delete",
  disabled = false,
  variant = "outline",
}: {
  onClick: (e?: any) => void;
  title?: string;
  disabled?: boolean;
  variant?: "outline" | "solid";
}) {
  const solid = variant === "solid";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        border: solid ? "1px solid #ef4444" : "1px solid rgba(239,68,68,0.55)",
        background: solid ? "#ef4444" : "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: solid ? "none" : "0 1px 10px rgba(0,0,0,0.06)",
        color: solid ? "#fff" : "#b91c1c",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {useAppIcon("delete")}
    </button>
  );
}