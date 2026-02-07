| Layer              | Purpose             | Contains                           |
| ------------------ | ------------------- | ---------------------------------- |
| **Domain**         | Business rules      | Rules, entities, pure functions    |
| **Application**    | Use cases           | Services, validators, transactions |
| **Infrastructure** | Tech implementation | Models, repos, pipelines, adapters |
| **Interfaces**     | IO layer            | Controllers, routes, DTO mappers   |

In Every routes you have to controller you have to use ".send(ApiResponse.fetched(responseData, 'User fetched successfully'));" this kind of pattern to send response and you have to update every response shcema according to this pattern."
