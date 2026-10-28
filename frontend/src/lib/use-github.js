import { useEffect, useState } from "react";
import { GITHUB_USER, PROJECTS } from "@/lib/content";
import { API, getJson, whenIdle } from "@/lib/utils";

let projects = null;
let graph = null;

export function useProjects() {
  const [list, setList] = useState(projects ?? PROJECTS);
  useEffect(() => {
    if (projects || !GITHUB_USER) {
      return;
    }
    return whenIdle(() => {
      void getJson(`${API}/github/projects`).then((data) => {
        if (data?.length) {
          const curated = new Map(PROJECTS.map((p) => [p.name, p.description]));
          projects = data.map((p) => ({ ...p, description: curated.get(p.name) ?? p.description }));
          setList(projects);
        }
      });
    });
  }, []);
  return list;
}

export function useContributions() {
  const [data, setData] = useState(graph);
  useEffect(() => {
    if (graph || !GITHUB_USER) {
      return;
    }
    return whenIdle(() => {
      void getJson(`${API}/github/contributions`).then((result) => {
        if (result?.weeks) {
          graph = result;
          setData(result);
        }
      });
    });
  }, []);
  return data;
}
