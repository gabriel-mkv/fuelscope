import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Caminhos resolvidos a partir deste arquivo, não do diretório atual: nada fora de site/dist é apagado.
const webDir = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(webDir, "dist");
const dataDir = path.join(webDir, "..", "data");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await build({
    entryPoints: [path.join(webDir, "src/main.ts")],
    bundle: true,
    outfile: path.join(outDir, "app.js"),
    target: "es2022",
    minify: true,
    sourcemap: true,
});

await cp(path.join(webDir, "public"), outDir, { recursive: true });

if (existsSync(dataDir)) {
    await cp(dataDir, path.join(outDir, "data"), { recursive: true });
} else {
    console.warn("Pasta data/ não encontrada: rode a aplicação Java antes para gerar os JSON.");
}