//! luau-check: compiles every .luau file with the real Luau compiler (syntax check) and runs
//! unit tests for pure modules with a minimal fake Roblox instance tree + `require` shim.
//!
//!   luau-check check <dir>...           compile all .luau/.lua files
//!   luau-check test <tests.luau> <src>  run a test script against the source tree

use mlua::{Lua, Result, Table, Value};
use std::path::{Path, PathBuf};

fn collect(dir: &Path, out: &mut Vec<PathBuf>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        let mut entries: Vec<_> = entries.flatten().collect();
        entries.sort_by_key(|e| e.path());
        for entry in entries {
            let path = entry.path();
            if path.is_dir() {
                collect(&path, out);
            } else if let Some(ext) = path.extension() {
                if ext == "luau" || ext == "lua" {
                    out.push(path);
                }
            }
        }
    }
}

fn check(dirs: &[String]) -> i32 {
    let lua = Lua::new();
    let mut files = Vec::new();
    for d in dirs {
        collect(Path::new(d), &mut files);
    }
    let mut failures = 0;
    for file in &files {
        let src = std::fs::read_to_string(file).expect("read");
        let name = file.display().to_string();
        match lua.load(&src).set_name(name.clone()).into_function() {
            Ok(_) => {}
            Err(e) => {
                failures += 1;
                println!("FAIL {}\n  {}", name, e);
            }
        }
    }
    println!("compiled {} files, {} failed", files.len(), failures);
    if failures > 0 { 1 } else { 0 }
}

fn run_tests(test_file: &str, src_root: &str) -> Result<i32> {
    let lua = Lua::new();
    let globals = lua.globals();

    globals.set(
        "__readfile",
        lua.create_function(|_, path: String| Ok(std::fs::read_to_string(&path).ok()))?,
    )?;
    globals.set(
        "__isdir",
        lua.create_function(|_, path: String| Ok(Path::new(&path).is_dir()))?,
    )?;
    globals.set(
        "__isfile",
        lua.create_function(|_, path: String| Ok(Path::new(&path).is_file()))?,
    )?;
    globals.set(
        "__loadchunk",
        lua.create_function(|lua, (src, name, env): (String, String, Table)| {
            lua.load(&src).set_name(name).set_environment(env).into_function()
        })?,
    )?;
    globals.set("__SRC_ROOT", src_root)?;

    let prelude = include_str!("prelude.lua");
    lua.load(prelude).set_name("prelude").exec()?;

    let src = std::fs::read_to_string(test_file).expect("read tests");
    let result: Value = lua.load(&src).set_name(test_file).call(())?;
    let failures = match result {
        Value::Integer(n) => n as i32,
        Value::Number(n) => n as i32,
        _ => 0,
    };
    Ok(if failures > 0 { 1 } else { 0 })
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        eprintln!("usage: luau-check check <dir>... | luau-check test <tests.luau> <srcroot>");
        std::process::exit(2);
    }
    let code = match args[1].as_str() {
        "check" => check(&args[2..]),
        "test" => match run_tests(&args[2], &args[3]) {
            Ok(code) => code,
            Err(e) => {
                println!("test runner error: {}", e);
                1
            }
        },
        _ => 2,
    };
    std::process::exit(code);
}
