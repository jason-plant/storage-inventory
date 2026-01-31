import { useAppIcon } from "./Icons";

export default function EditIconButton({
  onClick,
  title = "Edit",
  disabled = false,
}: {
  onClick: (e?: any) => void;
  title?: string;
  disabled?: boolean;
}) {
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
        border: "1px solid rgba(17,17,17,0.15)",
        background: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        color: "#111",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {useAppIcon("edit")}
    </button>
  );
}