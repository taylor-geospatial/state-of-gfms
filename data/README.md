# Data dictionary

Both files are JSON Lines, with one record per line.

| File                                               | Contents                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`extracted_info.jsonl`](extracted_info.jsonl)     | The 152 paper records used for paper-level statistics such as weight releases and pretraining data. |
| [`reported_numbers.jsonl`](reported_numbers.jsonl) | The 11,488 normalized benchmark scores. Several papers can report scores for the same model.        |

Use `extracted_info.jsonl` for questions about publications and `reported_numbers.jsonl` for questions about benchmark scores. For example, the A2-MAE paper reports **95.63 accuracy for SeCo on EuroSAT**. A2-MAE is the paper reporting the result, SeCo is the model evaluated, and 95.63 is the score.

## Fields in `extracted_info.jsonl`

| Key                                       | Meaning                                                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `year`, `model_name`             | Paper title, publication year (an integer), and the main model identified in the paper.                                                                                                   |
| `architecture`                            | `backbone` names the backbone, `type` describes the architecture, `params_millions` gives the size in millions of parameters, and `notes` holds extra details.                            |
| `pretraining`                             | `method`, `method_details`, and `objective` describe how the model was trained. `is_self_supervised` and `is_vision_language` flag those properties.                                      |
| `pretraining_data`                        | `datasets`, `sensors`, and `modalities` describe the training inputs. `num_images`, `geographic_coverage`, and `spatial_resolution` describe their scale and coverage where recorded.     |
| `downstream_tasks`, `downstream_datasets` | Lists of tasks and datasets used for evaluation, such as scene classification and EuroSAT.                                                                                                |
| `code_available`, `code_url`              | Recorded code-release status and the repository or project URL, when available.                                                                                                           |
| `weights_available`                       | `true` for released weights (93 papers), `false` for explicitly unreleased weights (26), and `null` when weights could not be found (33). The paper’s 39% combines the latter two groups. |
| `key_contribution`                        | Short extracted summary of the paper’s contribution.                                                                                                                                      |
| `_source_pdf`, `_extraction_timestamp`    | Source PDF filename used to identify the paper, and when its metadata was extracted.                                                                                                      |

## Fields in `reported_numbers.jsonl`

| Key                                              | Meaning                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `result_id`                                      | Unique string ID for one score. Keep it as a string because some IDs contain letters.                                                                                                                                                                                                               |
| `paper_id`, `title`, `year`                      | The paper reporting the score. The year is a string here. To link a result to a paper, match `paper_id` to `_source_pdf`. For truncated filenames, remove the trailing `.pdf` and use a prefix match only if it identifies a single paper. `ALISE.pdf` is the one ID with no matching paper record. |
| `model_name`, `model_name_raw`                   | Normalized name of the evaluated model and its extracted label, e.g. `seco` and `SeCo`. This can be a baseline from another paper.                                                                                                                                                                  |
| `benchmark_name`, `benchmark_name_raw`           | Normalized benchmark name and its extracted label, e.g. `eurosat` and `EuroSAT`. A suffix such as `@10pct` identifies a training-label fraction.                                                                                                                                                    |
| `metric_name`, `metric_name_raw`, `metric_value` | Normalized metric, extracted metric label, and numeric score, e.g. `accuracy`, `Accuracy`, and `95.63`. Interpret the value in the metric’s own units.                                                                                                                                              |
| `evaluation_strategy`                            | How the model was evaluated, e.g. `Full Finetuning`, `Linear Probe`, `kNN`, or `Zero-shot`.                                                                                                                                                                                                         |
| `num_training_samples`                           | Recorded training-sample count, stored as text. An empty string means no count was recorded.                                                                                                                                                                                                        |
| `train_regime`                                   | Group used in the analysis, e.g. `fewshot_5`, `lowshot`, or `full`. Missing sample counts default to `full`, so this field alone cannot establish that all labels were used.                                                                                                                        |
| `label_fraction`                                 | Explicitly recorded fraction of training labels used, e.g. `"10%"` or `"100%"`. An empty string means unspecified.                                                                                                                                                                                  |
