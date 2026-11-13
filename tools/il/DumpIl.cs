using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Reflection.Emit;
using System.Text;

internal static class DumpIl
{
    private static readonly Dictionary<int, OpCode> Ops = new Dictionary<int, OpCode>();
    private static string[] dirs;

    private static void BuildOps()
    {
        foreach (FieldInfo f in typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            OpCode op = (OpCode)f.GetValue(null);
            int key = op.Size == 2 ? (int)(ushort)op.Value : (int)op.Value;
            Ops[key] = op;
        }
    }

    private static Assembly Resolve(object sender, ResolveEventArgs e)
    {
        string simple = new AssemblyName(e.Name).Name;
        string file = simple + ".dll";
        if (dirs != null)
        {
            for (int i = 0; i < dirs.Length; i++)
            {
                try
                {
                    string p = Path.Combine(dirs[i], file);
                    if (File.Exists(p)) return Assembly.LoadFrom(p);
                }
                catch (Exception) { }
            }
        }
        return null;
    }

    private static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("usage: DumpIl <assembly> <Type::Method|Type> ...");
            return 2;
        }
        BuildOps();
        string game = @"C:\Program Files (x86)\Steam\steamapps\common\RimWorld";
        string ws = @"C:\Program Files (x86)\Steam\steamapps\workshop\content\294100";
        dirs = new string[]
        {
            game,
            Path.Combine(game, "Data", "Core"),
            Path.Combine(ws, "3328729902", "1.7", "Assemblies"),
            Path.Combine(ws, "1127530465", "Dependencies"),
            @"C:\Misaki\Game\RimCrow\mods\NHT_CustomDolls\Assemblies",
            Path.GetDirectoryName(Path.GetFullPath(args[0]))
        };
        AppDomain.CurrentDomain.AssemblyResolve += Resolve;
        Assembly asm = Assembly.LoadFrom(Path.GetFullPath(args[0]));
        Type[] all;
        try { all = asm.GetTypes(); }
        catch (ReflectionTypeLoadException ex)
        {
            List<Type> keep = new List<Type>();
            for (int i = 0; i < ex.Types.Length; i++) if (ex.Types[i] != null) keep.Add(ex.Types[i]);
            all = keep.ToArray();
            Console.WriteLine("// partial type load: " + (ex.LoaderExceptions.Length > 0 && ex.LoaderExceptions[0] != null ? ex.LoaderExceptions[0].Message : "?"));
        }
        for (int a = 1; a < args.Length; a++)
        {
            string spec = args[a];
            if (spec.StartsWith("SCAN:", StringComparison.Ordinal))
            {
                Scan(all, spec.Substring(5));
                continue;
            }
            int idx = spec.IndexOf("::", StringComparison.Ordinal);
            string tn = idx < 0 ? spec : spec.Substring(0, idx);
            string mn = idx < 0 ? null : spec.Substring(idx + 2);
            Type t = null;
            for (int i = 0; i < all.Length; i++) if (all[i] != null && all[i].FullName == tn) { t = all[i]; break; }
            if (t == null)
            {
                Console.WriteLine("// type not found: " + tn);
                continue;
            }
            if (mn == null)
            {
                Console.WriteLine("// type " + t.FullName + " methods:");
                foreach (MethodInfo mi in t.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly))
                    Console.WriteLine("//   " + mi.Name + "(" + Params(mi) + ")");
                Console.WriteLine("// type " + t.FullName + " fields:");
                foreach (FieldInfo fi in t.GetFields(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly))
                    Console.WriteLine("//   " + (fi.IsStatic ? "static " : "") + fi.FieldType.FullName + " " + fi.Name
                        + (fi.IsPublic ? " [public]" : fi.IsFamily ? " [protected]" : " [private]"));
                continue;
            }
            MethodInfo m = null;
            MethodInfo[] ms = t.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly);
            for (int i = 0; i < ms.Length; i++) if (ms[i].Name == mn) { m = ms[i]; break; }
            if (m == null) { Console.WriteLine("// method not found: " + spec); continue; }
            Dump(m);
        }
        return 0;
    }

    private static string Params(MethodInfo m)
    {
        ParameterInfo[] ps = m.GetParameters();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ps.Length; i++)
        {
            if (i > 0) sb.Append(", ");
            sb.Append(ps[i].ParameterType.Name).Append(' ').Append(ps[i].Name);
        }
        return sb.ToString();
    }

    private static string ResolveTok(MethodBase m, int tok)
    {
        try
        {
            Type[] gt = m.DeclaringType == null ? null : m.DeclaringType.GetGenericArguments();
            Type[] gm = m.IsGenericMethod ? m.GetGenericArguments() : null;
            MemberInfo mi = m.Module.ResolveMember(tok, gt, gm);
            if (mi == null) return "0x" + tok.ToString("X8");
            Type dt = mi.DeclaringType;
            return (dt == null ? "" : dt.Name + ".") + mi.Name;
        }
        catch (Exception)
        {
            return "0x" + tok.ToString("X8");
        }
    }

    private static string ResolveStr(MethodBase m, int tok)
    {
        try { return "\"" + m.Module.ResolveString(tok) + "\""; }
        catch (Exception) { return "0x" + tok.ToString("X8"); }
    }

    private static string ResolveType(MethodBase m, int tok)
    {
        try
        {
            Type[] gt = m.DeclaringType == null ? null : m.DeclaringType.GetGenericArguments();
            Type[] gm = m.IsGenericMethod ? m.GetGenericArguments() : null;
            Type t = m.Module.ResolveType(tok, gt, gm);
            return t == null ? "0x" + tok.ToString("X8") : t.Name;
        }
        catch (Exception) { return "0x" + tok.ToString("X8"); }
    }

    private static int OperandSize(OpCode op, byte[] il, int pos)
    {
        switch (op.OperandType)
        {
            case OperandType.InlineNone: return 0;
            case OperandType.ShortInlineI:
            case OperandType.ShortInlineVar:
            case OperandType.ShortInlineBrTarget: return 1;
            case OperandType.InlineVar: return 2;
            case OperandType.InlineI:
            case OperandType.ShortInlineR:
            case OperandType.InlineBrTarget:
            case OperandType.InlineString:
            case OperandType.InlineMethod:
            case OperandType.InlineField:
            case OperandType.InlineType:
            case OperandType.InlineTok:
            case OperandType.InlineSig: return 4;
            case OperandType.InlineI8:
            case OperandType.InlineR: return 8;
            case OperandType.InlineSwitch: return 4 + 4 * BitConverter.ToInt32(il, pos);
        }
        return 0;
    }

    private static void Scan(Type[] all, string target)
    {
        Console.WriteLine("// scan callers of " + target);
        for (int ti = 0; ti < all.Length; ti++)
        {
            Type t = all[ti];
            if (t == null) continue;
            MethodInfo[] ms;
            try { ms = t.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly); }
            catch (Exception) { continue; }
            for (int mi2 = 0; mi2 < ms.Length; mi2++)
            {
                MethodInfo m = ms[mi2];
                MethodBody body;
                try { body = m.GetMethodBody(); }
                catch (Exception) { continue; }
                if (body == null) continue;
                byte[] il = body.GetILAsByteArray();
                int pos = 0;
                while (pos < il.Length)
                {
                    int start = pos;
                    int b = il[pos++];
                    int key = b;
                    if (b == 0xFE && pos < il.Length) key = 0xFE00 | il[pos++];
                    OpCode op;
                    if (!Ops.TryGetValue(key, out op)) break;
                    if (op.OperandType == OperandType.InlineMethod)
                    {
                        string nm = ResolveTok(m, BitConverter.ToInt32(il, pos));
                        if (nm != null && nm.EndsWith("." + target, StringComparison.Ordinal))
                            Console.WriteLine("//   " + t.FullName + "." + m.Name + " @" + start.ToString("X4") + " -> " + nm);
                    }
                    pos += OperandSize(op, il, pos);
                }
            }
        }
    }

    private static void Dump(MethodBase m)
    {
        Console.WriteLine();
        Console.WriteLine("=== " + m.DeclaringType.FullName + "." + m.Name + "(" + (m is MethodInfo ? Params((MethodInfo)m) : "") + ")");
        MethodBody body = null;
        try { body = m.GetMethodBody(); }
        catch (Exception e) { Console.WriteLine("// no body: " + e.Message); return; }
        if (body == null) { Console.WriteLine("// (no body)"); return; }
        byte[] il = body.GetILAsByteArray();
        int pos = 0;
        while (pos < il.Length)
        {
            int start = pos;
            int b = il[pos++];
            int key = b;
            if (b == 0xFE && pos < il.Length) key = 0xFE00 | il[pos++];
            OpCode op;
            if (!Ops.TryGetValue(key, out op))
            {
                Console.WriteLine(start.ToString("X4") + ": ?? 0x" + key.ToString("X2"));
                return;
            }
            string operand = "";
            switch (op.OperandType)
            {
                case OperandType.InlineNone:
                    break;
                case OperandType.ShortInlineI:
                    operand = ((sbyte)il[pos]).ToString(); pos += 1; break;
                case OperandType.ShortInlineVar:
                    operand = il[pos].ToString(); pos += 1; break;
                case OperandType.ShortInlineBrTarget:
                    operand = "IL_" + (pos + 1 + (sbyte)il[pos]).ToString("X4"); pos += 1; break;
                case OperandType.InlineVar:
                    operand = BitConverter.ToUInt16(il, pos).ToString(); pos += 2; break;
                case OperandType.InlineBrTarget:
                    operand = "IL_" + (pos + 4 + BitConverter.ToInt32(il, pos)).ToString("X4"); pos += 4; break;
                case OperandType.InlineI:
                    operand = BitConverter.ToInt32(il, pos).ToString(); pos += 4; break;
                case OperandType.InlineI8:
                    operand = BitConverter.ToInt64(il, pos).ToString(); pos += 8; break;
                case OperandType.ShortInlineR:
                    operand = BitConverter.ToSingle(il, pos).ToString(); pos += 4; break;
                case OperandType.InlineR:
                    operand = BitConverter.ToDouble(il, pos).ToString(); pos += 8; break;
                case OperandType.InlineString:
                    operand = ResolveStr(m, BitConverter.ToInt32(il, pos)); pos += 4; break;
                case OperandType.InlineMethod:
                    operand = ResolveTok(m, BitConverter.ToInt32(il, pos)); pos += 4; break;
                case OperandType.InlineField:
                    operand = "fld:" + ResolveTok(m, BitConverter.ToInt32(il, pos)); pos += 4; break;
                case OperandType.InlineType:
                    operand = ResolveType(m, BitConverter.ToInt32(il, pos)); pos += 4; break;
                case OperandType.InlineTok:
                    operand = "tok:" + ResolveTok(m, BitConverter.ToInt32(il, pos)); pos += 4; break;
                case OperandType.InlineSig:
                    operand = "sig:0x" + BitConverter.ToInt32(il, pos).ToString("X8"); pos += 4; break;
                case OperandType.InlineSwitch:
                    int n = BitConverter.ToInt32(il, pos); pos += 4;
                    StringBuilder sb = new StringBuilder();
                    sb.Append(n).Append(" [");
                    int baseOff = pos + 4 * n;
                    for (int i = 0; i < n; i++) { if (i > 0) sb.Append(','); sb.Append("IL_").Append((baseOff + BitConverter.ToInt32(il, pos)).ToString("X4")); pos += 4; }
                    sb.Append(']');
                    operand = sb.ToString();
                    break;
                default:
                    operand = "?operand " + op.OperandType;
                    break;
            }
            Console.WriteLine(start.ToString("X4") + ": " + op.Name + (operand.Length > 0 ? " " + operand : ""));
        }
    }
}
